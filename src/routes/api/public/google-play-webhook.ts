// Google Play RTDN (Real-time Developer Notifications) webhook — STUB.
//
// Estado: arquiva todos os eventos numa tabela de reconciliação
// (`google_play_events`) com `processing_status = 'pending_integration'`.
// Ainda NÃO credita membership nem packs. Antes de ligar ao Google Play
// Billing "para valer" falta fazer:
//
//   1. Verificar assinatura do JWT (Pub/Sub push, header `Authorization: Bearer`
//      com audience = URL desta rota) usando `google-auth-library` ou similar.
//   2. Chamar `androidpublisher.purchases.subscriptionsv2.get` /
//      `purchases.products.get` com um service account para revalidar o
//      purchaseToken e obter o `linkedPurchaseToken`, expiryTime, autoRenew,
//      countryCode, priceAmountMicros, etc.
//   3. Mapear productId → { plan_tier, period_months } e o purchaseToken →
//      user (via `obfuscatedExternalAccountId` que passamos no
//      `BillingClient.launchBillingFlow`).
//   4. Aplicar transição de membership atomically:
//        - SUBSCRIPTION_PURCHASED / RECOVERED / RENEWED → premium_active + expires_at
//        - SUBSCRIPTION_ON_HOLD / IN_GRACE_PERIOD      → grace + expires_at
//        - SUBSCRIPTION_CANCELED (autoRenew=false)     → cancelled
//        - SUBSCRIPTION_EXPIRED / REVOKED              → expired + revoke acesso
//        - ONE_TIME_PRODUCT_PURCHASED (pack)           → credit_pack(pack_id)
//   5. Marcar `processing_status = 'processed'` e `matched_user_id`.
//
// Enquanto o TODO acima não estiver feito, o evento fica arquivado —
// permite reprocessar historicamente assim que a integração ficar viva.

import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

// Google Pub/Sub push envelope — o Play envia sempre nesta forma.
interface PubSubPushEnvelope {
  message?: {
    messageId?: string
    publishTime?: string
    data?: string // base64
    attributes?: Record<string, string>
  }
  subscription?: string
}

// Payload do Play (depois de decodificar base64 do message.data)
// https://developer.android.com/google/play/billing/rtdn-reference
interface RtdnPayload {
  version?: string
  packageName?: string
  eventTimeMillis?: string
  subscriptionNotification?: {
    version?: string
    notificationType?: number
    purchaseToken?: string
    subscriptionId?: string
  }
  oneTimeProductNotification?: {
    version?: string
    notificationType?: number
    purchaseToken?: string
    sku?: string
  }
  voidedPurchaseNotification?: {
    purchaseToken?: string
    productType?: number
    refundType?: number
  }
  testNotification?: { version?: string }
}

function decodePayload(dataB64: string | undefined): RtdnPayload | null {
  if (!dataB64) return null
  try {
    const raw = Buffer.from(dataB64, 'base64').toString('utf8')
    return JSON.parse(raw) as RtdnPayload
  } catch (err) {
    console.error('[google-play-webhook] payload decode failed', err)
    return null
  }
}

function extractEventType(p: RtdnPayload): string {
  if (p.subscriptionNotification) return 'subscription'
  if (p.oneTimeProductNotification) return 'one_time'
  if (p.voidedPurchaseNotification) return 'voided'
  if (p.testNotification) return 'test'
  return 'unknown'
}

export const Route = createFileRoute('/api/public/google-play-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // TODO(auth): validar Bearer JWT do Pub/Sub push com audience esperada.
        //   const authz = request.headers.get('authorization') ?? ''
        //   await verifyGoogleIdToken(authz, EXPECTED_AUDIENCE)

        let envelope: PubSubPushEnvelope
        try {
          envelope = (await request.json()) as PubSubPushEnvelope
        } catch {
          return new Response('Invalid JSON', { status: 400 })
        }

        const msg = envelope.message
        if (!msg) return new Response('Missing message', { status: 400 })

        const payload = decodePayload(msg.data)
        if (!payload) {
          return new Response('Invalid payload', { status: 400 })
        }

        const eventType = extractEventType(payload)
        const purchaseToken =
          payload.subscriptionNotification?.purchaseToken ??
          payload.oneTimeProductNotification?.purchaseToken ??
          payload.voidedPurchaseNotification?.purchaseToken ??
          null
        const productId =
          payload.oneTimeProductNotification?.sku ??
          payload.subscriptionNotification?.subscriptionId ??
          null
        const notificationType =
          payload.subscriptionNotification?.notificationType ??
          payload.oneTimeProductNotification?.notificationType ??
          null

        // Idempotência: se já registámos este messageId, devolvemos 200
        // (o Pub/Sub retenta agressivamente).
        const { error: insertError } = await supabaseAdmin
          .from('google_play_events')
          .insert({
            message_id: msg.messageId ?? null,
            package_name: payload.packageName ?? null,
            event_type: eventType,
            purchase_token: purchaseToken,
            product_id: productId,
            subscription_id: payload.subscriptionNotification?.subscriptionId ?? null,
            notification_type: notificationType,
            raw_payload: payload as unknown as never,
            processing_status: 'pending_integration',
          })

        if (insertError && insertError.code !== '23505') {
          // 23505 = duplicate message_id (esperado em retries do Pub/Sub)
          console.error('[google-play-webhook] insert failed', insertError)
          // Devolve 500 para o Pub/Sub retentar.
          return new Response('Storage error', { status: 500 })
        }

        // TODO(reconciliation): assim que a integração estiver pronta,
        // chamar aqui `processGooglePlayEvent(payload)` que:
        //   - resolve o user via obfuscatedExternalAccountId
        //   - revalida com Play Developer API
        //   - aplica membership/credit_pack transitions
        //   - marca a linha como 'processed' ou 'error'

        return new Response(JSON.stringify({ ok: true, archived: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
    },
  },
})
