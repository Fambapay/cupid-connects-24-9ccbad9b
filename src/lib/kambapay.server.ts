// Server-only client for the KambaPay (kambafy.com) public payments API.
// Used for Angola Multicaixa Express + Referência Multicaixa flows.

const BASE_URL =
  "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambapay-public-api";

export type KambapayMethod = "express" | "reference";

export interface KambapayReference {
  entity: string;
  number: string;
  reference?: string;
  instructions?: string;
  expiresIn?: string;
  expiresAt?: string;
}

export interface KambapayPaymentResult {
  ok: boolean;
  httpStatus: number;
  payment?: {
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    status: string;
    reference?: KambapayReference;
  };
  error?: string;
  raw: unknown;
}

interface CreatePaymentInput {
  orderId: string;
  amount: number; // integer Kz
  method: KambapayMethod;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null; // required for express; +244XXXXXXXXX
}

export async function createKambapayPayment(
  input: CreatePaymentInput,
): Promise<KambapayPaymentResult> {
  const apiKey = process.env.KAMBAPAY_API_KEY;
  if (!apiKey) {
    return { ok: false, httpStatus: 0, error: "missing_api_key", raw: null };
  }

  const body: Record<string, unknown> = {
    orderId: input.orderId,
    amount: input.amount,
    currency: "AOA",
    paymentMethod: input.method,
    customerName: input.customerName,
  };
  if (input.customerEmail) body.email = input.customerEmail;
  if (input.method === "express") {
    if (!input.customerPhone) {
      return { ok: false, httpStatus: 0, error: "missing_phone", raw: null };
    }
    body.customerPhone = input.customerPhone;
  }

  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return {
      ok: false,
      httpStatus: 0,
      error: e instanceof Error ? e.message : "network_error",
      raw: null,
    };
  }

  const raw = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  if (!resp.ok) {
    return {
      ok: false,
      httpStatus: resp.status,
      error:
        typeof raw.error === "string"
          ? raw.error
          : `kambapay_http_${resp.status}`,
      raw,
    };
  }

  const payment = (raw.payment ?? null) as KambapayPaymentResult["payment"];
  if (!payment?.id) {
    return { ok: false, httpStatus: resp.status, error: "bad_response", raw };
  }
  return { ok: true, httpStatus: resp.status, payment, raw };
}
