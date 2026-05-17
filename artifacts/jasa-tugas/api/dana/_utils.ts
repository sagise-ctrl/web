import crypto from "crypto";

export const DANA_QRIS_PATH = "/v1.0/qr/qr-mpm-generate.htm";
export const DANA_NOTIFY_PATH = "/v1.0/debit/notify";

export function danaBaseUrl() {
  return process.env.DANA_IS_PRODUCTION === "true"
    ? "https://api.dana.id"
    : "https://api.sandbox.dana.id";
}

export function jakartaTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function normalizePem(value: string) {
  let pem = value.trim();
  if (
    (pem.startsWith('"') && pem.endsWith('"')) ||
    (pem.startsWith("'") && pem.endsWith("'"))
  ) {
    pem = pem.slice(1, -1).trim();
  }

  pem = pem.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

  const headerMatch = pem.match(/-----BEGIN [A-Z ]+-----/);
  const footerMatch = pem.match(/-----END [A-Z ]+-----/);

  if (headerMatch && footerMatch) {
    const header = headerMatch[0];
    const footer = footerMatch[0];
    const body = pem
      .slice((headerMatch.index ?? 0) + header.length, footerMatch.index)
      .replace(/\s+/g, "");
    return `${header}\n${body.match(/.{1,64}/g)?.join("\n") || body}\n${footer}\n`;
  }

  const body = pem.replace(/\s+/g, "");
  return `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)?.join("\n") || body}\n-----END PRIVATE KEY-----\n`;
}

export function minifyBody(body: unknown) {
  // Deterministic JSON stringify: sort object keys recursively.
  function stableStringify(value: any): string {
    if (value === null) return "null";
    const t = typeof value;
    if (t === "string" || t === "number" || t === "boolean") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return (
        "[" +
        value
          .map((v) => (v === undefined ? "null" : stableStringify(v)))
          .join(",") +
        "]"
      );
    }
    if (t === "object") {
      const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
      return (
        "{" +
        keys
          .map((k) => JSON.stringify(k) + ":" + stableStringify(value[k]))
          .join(",") +
        "}"
      );
    }
    // fallback (functions, undefined, symbols) — stringify as null
    return "null";
  }

  return stableStringify(body ?? {});
}

export function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").toLowerCase();
}

export function danaStringToSign(
  method: string,
  path: string,
  body: unknown | string,
  timestamp: string,
) {
  const bodyString = typeof body === "string" ? body : minifyBody(body);
  return [method.toUpperCase(), path, sha256Hex(bodyString), timestamp].join(":");
}

export function signDanaRequest(
  method: string,
  path: string,
  body: unknown | string,
  timestamp: string,
) {
  const privateKey = process.env.DANA_PRIVATE_KEY;
  if (!privateKey) throw new Error("DANA_PRIVATE_KEY belum diset");

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(danaStringToSign(method, path, body, timestamp));
  signer.end();
  try {
    return signer.sign(normalizePem(privateKey), "base64");
  } catch (err: any) {
    throw new Error(
      "DANA_PRIVATE_KEY tidak bisa dibaca sebagai RSA private key. Pastikan value berisi PEM lengkap BEGIN/END PRIVATE KEY atau base64 PKCS#8. Detail: " +
        err.message,
    );
  }
}

export function verifyDanaSignature(
  method: string,
  path: string,
  body: unknown,
  timestamp: string,
  signature: string,
) {
  const publicKey = process.env.DANA_PUBLIC_KEY;
  if (!publicKey) throw new Error("DANA_PUBLIC_KEY belum diset");

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(danaStringToSign(method, path, body, timestamp));
  verifier.end();
  try {
    return verifier.verify(normalizePem(publicKey), signature, "base64");
  } catch (err: any) {
    throw new Error(
      "DANA_PUBLIC_KEY tidak bisa dibaca sebagai RSA public key. Pastikan value berisi PEM lengkap BEGIN/END PUBLIC KEY. Detail: " +
        err.message,
    );
  }
}

export function makeExternalId(prefix = "EXT") {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, "");
  return `${prefix}${date}${crypto.randomBytes(6).toString("hex")}`.slice(0, 36);
}

export function makePartnerReferenceNo(orderId: string, tipe: "dp" | "final") {
  const suffix = tipe === "dp" ? "DP" : "F";
  const partnerReferenceNo = `${orderId}-${suffix}`;
  if (partnerReferenceNo.length > 25) {
    throw new Error("order_id terlalu panjang untuk partnerReferenceNo DANA");
  }
  return partnerReferenceNo;
}

export function parsePartnerReferenceNo(partnerReferenceNo: string) {
  if (partnerReferenceNo.endsWith("-DP")) {
    return { tipe: "dp" as const, orderId: partnerReferenceNo.slice(0, -3) };
  }
  if (partnerReferenceNo.endsWith("-FINAL")) {
    return { tipe: "final" as const, orderId: partnerReferenceNo.slice(0, -6) };
  }
  if (partnerReferenceNo.endsWith("-F")) {
    return { tipe: "final" as const, orderId: partnerReferenceNo.slice(0, -2) };
  }
  return null;
}

export function moneyValue(amount: number) {
  return amount.toFixed(2);
}
