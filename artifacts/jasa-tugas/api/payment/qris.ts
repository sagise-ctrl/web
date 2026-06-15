import type { VercelRequest, VercelResponse } from "@vercel/node";

const GRAPHQL_ENDPOINT = "https://api.mayar.id/graphql";
const MAYAR_DOMAIN = "jagantara-global.myr.id";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { transaction_id } = req.body;
  console.log("QRIS: transaction_id =", transaction_id);

  if (!transaction_id)
    return res.status(400).json({ error: "transaction_id wajib diisi" });

  try {
    // Step 1: trigger Mayar generate QR
    await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "createPaymentWithExistingTransaction",
        query: `
          mutation createPaymentWithExistingTransaction($input: CreatePaymentInput) {
            createPaymentWithExistingTransaction(input: $input) {
              status
              message
            }
          }
        `,
        variables: {
          input: {
            paymentLinkTransactionId: transaction_id,
            paymentType: "qris",
          },
        },
      }),
    });
    console.log("QRIS: step1 done");

    // Step 2: ambil qr_string
    const gqlRes = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "getPaymentRequest",
        query: `
          query getPaymentRequest($paymentLinkTransactionId: ID!, $domain: String!) {
            getPaymentRequest(
              paymentLinkTransactionId: $paymentLinkTransactionId
              domain: $domain
            ) {
              status
              response
            }
          }
        `,
        variables: {
          paymentLinkTransactionId: transaction_id,
          domain: MAYAR_DOMAIN,
        },
      }),
    });

    const rawText = await gqlRes.text();
    console.log("QRIS: step2 response =", rawText);

    const gqlData = JSON.parse(rawText);

    const node = gqlData?.data?.getPaymentRequest;

    if (!node) {
      return res
        .status(502)
        .json({ success: false, error: "Response GraphQL tidak valid" });
    }

    let parsed: any = {};
    try {
      parsed =
        typeof node.response === "string"
          ? JSON.parse(node.response)
          : node.response;
    } catch {
      return res
        .status(502)
        .json({ success: false, error: "Gagal parse response GraphQL" });
    }

    const qr_string: string | undefined =
      parsed?.payment_method?.qr_code?.channel_properties?.qr_string;
    const expires_at: string | undefined =
      parsed?.payment_method?.qr_code?.channel_properties?.expires_at;

    if (!qr_string) {
      return res
        .status(200)
        .json({ success: false, error: "qr_string tidak tersedia" });
    }

    return res
      .status(200)
      .json({ success: true, qr_string, expires_at: expires_at ?? null });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: "Gagal menghubungi Mayar: " + err.message,
    });
  }
}
