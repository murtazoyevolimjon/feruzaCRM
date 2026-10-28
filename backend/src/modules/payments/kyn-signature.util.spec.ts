import { signWebhook, verifyWebhookSignature } from './kyn-signature.util';

const fields = { transactionId: 'tx1', orderId: 'INV-1', amount: 500000, status: 'COMPLETED' };

describe('verifyWebhookSignature', () => {
  const secret = 'test-secret';

  it("to'g'ri imzoni qabul qiladi", () => {
    expect(verifyWebhookSignature(fields, signWebhook(fields, secret), secret)).toBe(true);
  });

  it("noto'g'ri imzoni rad etadi", () => {
    expect(verifyWebhookSignature(fields, 'deadbeef', secret)).toBe(false);
  });

  it("o'zgartirilgan summani rad etadi", () => {
    const sig = signWebhook(fields, secret);
    expect(verifyWebhookSignature({ ...fields, amount: 1 }, sig, secret)).toBe(false);
  });

  it("kalit bo'sh bo'lsa HAR DOIM rad etadi (13.4)", () => {
    expect(verifyWebhookSignature(fields, signWebhook(fields, ''), '')).toBe(false);
    expect(verifyWebhookSignature(fields, 'x', undefined)).toBe(false);
  });

  it("imzo yo'q bo'lsa rad etadi", () => {
    expect(verifyWebhookSignature(fields, undefined, secret)).toBe(false);
  });
});
