import { createHmac, timingSafeEqual } from 'crypto';

export interface WebhookFields {
  transactionId: string;
  orderId: string;
  amount: string | number;
  status: string;
}

export function signWebhook(fields: WebhookFields, secret: string): string {
  const payload = `${fields.transactionId}${fields.orderId}${fields.amount}${fields.status}`;
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * HMAC-SHA256 imzoni tekshiradi. Kalit yo'q bo'lsa — HAR DOIM false (13.4).
 */
export function verifyWebhookSignature(
  fields: WebhookFields,
  signature: string | undefined,
  secret: string | undefined,
): boolean {
  if (!secret || !signature) return false;
  const expected = Buffer.from(signWebhook(fields, secret), 'utf8');
  const actual = Buffer.from(signature, 'utf8');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
