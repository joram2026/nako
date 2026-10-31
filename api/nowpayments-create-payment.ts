import { createNowPaymentsPayment, getAuthenticatedFirebase } from '../src/utils/nowpaymentsService';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default async function handler(req: any, res: any) {
  // CORS support for Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { userId, userEmail, amountUSD, network, coinSymbol } = body || {};

    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'User authentication information is required.' });
    }

    const numAmount = parseFloat(amountUSD);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'A valid deposit amount is required.' });
    }

    const selectedCoin = (coinSymbol || 'USDT').toUpperCase();
    const selectedNet = (network || 'BEP20').toUpperCase();
    const orderId = `nowpay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Resolve callback URL dynamically based on host, falling back to akunacpt.site
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const callbackUrl = host ? `${protocol}://${host}/api/nowpayments/webhook` : 'https://akunacpt.site/api/nowpayments/webhook';

    // Call NOWPayments API
    const payment = await createNowPaymentsPayment({
      amountUSD: numAmount,
      network: selectedNet,
      coinSymbol: selectedCoin,
      orderId,
      userEmail,
      callbackUrl
    });

    // Save initial transaction record into Firestore as PENDING APPROVAL
    const expiresAtMs = Date.now() + 20 * 60 * 1000;
    const { db } = await getAuthenticatedFirebase();
    const newTxDoc = await addDoc(collection(db, 'transactions'), {
      userId,
      userEmail,
      type: 'deposit_crypto',
      amount: numAmount,
      priceAmount: numAmount,
      coinSymbol: selectedCoin,
      coinAmount: payment.payAmount,
      payAmount: payment.payAmount,
      network: selectedNet,
      address: payment.payAddress,
      nowpaymentsPaymentId: payment.paymentId,
      status: 'PENDING APPROVAL',
      gateway: 'nowpayments',
      gatewayStatus: payment.paymentStatus,
      expiresAtMs,
      createdAt: serverTimestamp()
    });

    return res.status(200).json({
      success: true,
      transactionId: newTxDoc.id,
      expiresAt: expiresAtMs,
      ...payment
    });
  } catch (err: any) {
    console.error('Error creating NOWPayments deposit:', err);
    return res.status(500).json({
      error: err.message || 'Failed to initiate automated crypto deposit.'
    });
  }
}
