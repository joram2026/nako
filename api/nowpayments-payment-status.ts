import { fetchNowPaymentsStatus, finalizePaymentCreditInFirestore } from '../src/utils/nowpaymentsService';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const paymentId = req.query?.paymentId || (req.body ? req.body.paymentId : null);

  if (!paymentId) {
    return res.status(400).json({ error: 'paymentId is required.' });
  }

  try {
    const payment = await fetchNowPaymentsStatus(paymentId);
    const paymentStatus = payment.payment_status; // 'waiting', 'confirming', 'confirmed', 'sending', 'partially_paid', 'finished', 'expired', 'failed'
    const txHash = payment.payin_hash || payment.payout_hash;
    const actuallyPaid = (payment.actually_paid !== undefined && payment.actually_paid !== null) 
      ? parseFloat(payment.actually_paid) 
      : undefined;

    let credited = false;
    // If payment reached finished, confirmed, or partially_paid with received crypto, credit the verified actual amount in Firestore
    if (paymentStatus === 'finished' || paymentStatus === 'confirmed' || (paymentStatus === 'partially_paid' && actuallyPaid && actuallyPaid > 0)) {
      await finalizePaymentCreditInFirestore({
        paymentId,
        txHash,
        actuallyPaidAmount: actuallyPaid,
        statusOverride: paymentStatus
      }).then(() => { credited = true; }).catch((e: any) => console.warn('Sync credit check:', e.message));
    } else if ((paymentStatus === 'expired' || paymentStatus === 'failed') && (!actuallyPaid || actuallyPaid <= 0)) {
      // Mark transaction failed if expired without funds
      const { markPaymentExpiredInFirestore } = await import('../src/utils/nowpaymentsService');
      await markPaymentExpiredInFirestore({
        paymentId,
        reason: 'Payment session expired with no funds detected on blockchain.'
      }).catch((e: any) => console.warn('Sync expire check:', e.message));
    }

    const isFinished = paymentStatus === 'finished' || paymentStatus === 'confirmed' || (paymentStatus === 'partially_paid' && actuallyPaid && actuallyPaid > 0) || credited;
    const isExpired = (paymentStatus === 'expired' || paymentStatus === 'failed') && (!actuallyPaid || actuallyPaid <= 0);

    return res.status(200).json({
      paymentId: payment.payment_id,
      paymentStatus: payment.payment_status,
      payAddress: payment.pay_address,
      payAmount: payment.pay_amount,
      payCurrency: payment.pay_currency,
      priceAmount: payment.price_amount,
      actuallyPaid: payment.actually_paid,
      payinHash: payment.payin_hash,
      isFinished,
      isExpired
    });
  } catch (err: any) {
    console.error('Error fetching NOWPayments status:', err);
    return res.status(500).json({
      error: err.message || 'Failed to fetch payment status.'
    });
  }
}
