// ─── Webhook Authentication ───────────────────────────────────────────────────
// Shared secret validation used by all n8n webhook callback routes.
// The secret is set in N8N_WEBHOOK_SECRET and must be included in every
// request from n8n as: Authorization: Bearer {secret}
//
// For added security, n8n workflows can echo back the webhook_secret that
// was included in the trigger payload — both paths are validated here.

import type { NextRequest } from 'next/server'

/**
 * Validate that the incoming request is from our n8n instance.
 * Accepts: Authorization: Bearer {N8N_WEBHOOK_SECRET}
 *       OR: X-Webhook-Secret: {N8N_WEBHOOK_SECRET}
 */
export function verifyWebhookSecret(req: NextRequest): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET

  // No secret configured — allow in development only
  if (!secret) {
    if (process.env.NODE_ENV === 'development') return true
    console.warn('[webhook-auth] N8N_WEBHOOK_SECRET is not set — rejecting request')
    return false
  }

  // Check Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  // Check X-Webhook-Secret header (alternative)
  const secretHeader = req.headers.get('x-webhook-secret')
  if (secretHeader === secret) return true

  return false
}

/**
 * Validate an API key for the app → n8n trigger endpoint.
 * Accepts: Authorization: Bearer {CRON_SECRET | N8N_WEBHOOK_SECRET}
 */
export function verifyApiAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) return false

  const token       = authHeader.slice(7)
  const cronSecret  = process.env.CRON_SECRET
  const n8nSecret   = process.env.N8N_WEBHOOK_SECRET

  if (cronSecret && token === cronSecret) return true
  if (n8nSecret  && token === n8nSecret)  return true

  // Allow unauthenticated in development
  if (process.env.NODE_ENV === 'development') return true

  return false
}
