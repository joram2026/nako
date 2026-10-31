import { verifyNowPaymentsSignature, finalizePaymentCreditInFirestore } from '../src/utils/nowpaymentsService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {}
    }

    const signature = req.headers['x-nowpayments-sig'];

    if (!payload || !signature) {
      console.warn('NOWPayments IPN missing payload or x-nowpayments-sig header.');
      return res.status(400).json({ error: 'Missing webhook payload or signature.' });
    }

    // Cryptographically verify HMAC-SHA512 signature
    const isValid = verifyNowPaymentsSignature(payload, signature);
    if (!isValid) {
      console.error('Invalid NOWPayments IPN signature received.');
      return res.status(401).json({ error: 'Invalid HMAC signature.' });
    }

    const paymentId = payload.payment_id;
    const paymentStatus = payload.payment_status; // 'waiting' | 'confirming' | 'confirmed' | 'sending' | 'finished' | 'failed'
    const actuallyPaid = payload.actually_paid ? parseFloat(payload.actually_paid) : undefined;
    const txHash = payload.payin_hash || payload.payout_hash;

    console.log(`[NOWPayments IPN] Payment ${paymentId} status: ${paymentStatus}`);

    // If status is finished, confirmed, or partially_paid with actual funds, credit user balance & referral perks atomically
    if (paymentStatus === 'finished' || paymentStatus === 'confirmed' || (paymentStatus === 'partially_paid' && actuallyPaid && actuallyPaid > 0)) {
      const creditResult = await finalizePaymentCreditInFirestore({
        paymentId,
        txHash,
        actuallyPaidAmount: actuallyPaid,
        statusOverride: paymentStatus
      });

      console.log(`[NOWPayments IPN Credited] Result:`, creditResult);
    } else if ((paymentStatus === 'expired' || paymentStatus === 'failed') && (!actuallyPaid || actuallyPaid <= 0)) {
      const { markPaymentExpiredInFirestore } = await import('../src/utils/nowpaymentsService');
      await markPaymentExpiredInFirestore({
        paymentId,
        reason: 'Payment expired on gateway.'
      }).catch((e: any) => console.warn('Webhook mark expired warning:', e.message));
    }

    // Always respond 200 OK to NOWPayments so they don't continually retry
    return res.status(200).json({
      received: true,
      paymentId,
      status: paymentStatus
    });
  } catch (err: any) {
    console.error('Error handling NOWPayments IPN callback:', err);
    return res.status(500).json({
      error: err.message || 'Error processing webhook.'
    });
  }
}
