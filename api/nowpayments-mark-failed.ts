import { markPaymentExpiredInFirestore } from '../src/utils/nowpaymentsService';

export default async function handler(req: any, res: any) {
  // CORS support
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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

    const { paymentId, reason } = body || {};

    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required.' });
    }

    const result = await markPaymentExpiredInFirestore({ paymentId, reason });
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Error marking payment as failed/expired:', err);
    return res.status(500).json({
      error: err.message || 'Failed to mark payment as failed.'
    });
  }
}
