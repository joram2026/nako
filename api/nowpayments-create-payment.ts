const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || 'PYDXSBF-NDHMQTS-GKV2KA5-YF3VFGK';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'paylon-766c0';
const FIREBASE_DATABASE_ID = process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'ai-studio-longpay-2d2973a8-89cc-4824-992f-b98cf1352817';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCMYK5YYczaMxFx8EutLD4HNXVO2nu6Jn4';

let cachedBotToken: string | null = null;
let botTokenExpiry = 0;

async function getServiceBotToken(): Promise<string> {
  const now = Date.now();
  if (cachedBotToken && now < botTokenExpiry - 60000) {
    return cachedBotToken;
  }
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'service-bot@longpay.internal',
      password: 'SystemGateway2026!Secure',
      returnSecureToken: true
    })
  });
  const data = await res.json();
  if (!data.idToken) {
    throw new Error(data.error?.message || 'Failed to authenticate service bot');
  }
  cachedBotToken = data.idToken;
  botTokenExpiry = now + (parseInt(data.expiresIn || '3600', 10) * 1000);
  return cachedBotToken;
}

function mapTicker(network: string, coinSymbol: string): string {
  const normNet = (network || '').toUpperCase().trim();
  const normCoin = (coinSymbol || 'USDT').toUpperCase().trim();

  if (normCoin === 'USDC') {
    if (normNet.includes('BEP20') || normNet.includes('BSC') || normNet.includes('BNB')) return 'usdcbsc';
    if (normNet.includes('SOL') || normNet.includes('SOLANA')) return 'usdcsol';
    if (normNet.includes('POLYGON') || normNet.includes('MATIC')) return 'usdcmatic';
    if (normNet.includes('ARB') || normNet.includes('ARBITRUM')) return 'usdcarb';
    if (normNet.includes('OP') || normNet.includes('OPTIMISM')) return 'usdcop';
    return 'usdc';
  }

  // USDT variants
  if (normNet.includes('TRC20') || normNet.includes('TRON') || normNet === 'TRX') return 'usdttrc20';
  if (normNet.includes('BEP20') || normNet.includes('BSC') || normNet.includes('BNB')) return 'usdtbsc';
  if (normNet.includes('SOL') || normNet.includes('SOLANA')) return 'usdtsol';
  if (normNet.includes('POLYGON') || normNet.includes('MATIC')) return 'usdtmatic';
  if (normNet.includes('ARB') || normNet.includes('ARBITRUM')) return 'usdtarb';
  if (normNet.includes('TON')) return 'usdtton';
  return 'usdterc20';
}

export default async function handler(req: any, res: any) {
  // CORS support
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

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const callbackUrl = host ? `${protocol}://${host}/api/nowpayments/webhook` : 'https://akunacpt.site/api/nowpayments/webhook';

    const payCurrency = mapTicker(selectedNet, selectedCoin);

    // Call NOWPayments REST API
    const npRes = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        price_amount: numAmount,
        price_currency: 'usd',
        pay_currency: payCurrency,
        order_id: orderId,
        order_description: `Deposit ${numAmount} USD for ${userEmail}`,
        ipn_callback_url: callbackUrl,
        is_fee_paid_by_user: false
      })
    });

    const npData = await npRes.json();
    if (!npRes.ok) {
      throw new Error(npData.message || npData.error || 'Failed to create payment with NOWPayments.');
    }

    const paymentId = String(npData.payment_id);
    const payAddress = npData.pay_address;
    const payAmount = npData.pay_amount;
    const expiresAtMs = Date.now() + 20 * 60 * 1000;
    let transactionId: string | null = null;

    // Register initial pending transaction via Firestore REST API (fast & resilient)
    try {
      const idToken = await getServiceBotToken();
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents/transactions`;
      
      const txPayload = {
        fields: {
          userId: { stringValue: userId },
          userEmail: { stringValue: userEmail },
          type: { stringValue: 'deposit_crypto' },
          amount: { doubleValue: numAmount },
          priceAmount: { doubleValue: numAmount },
          coinSymbol: { stringValue: selectedCoin },
          coinAmount: { doubleValue: payAmount },
          payAmount: { doubleValue: payAmount },
          network: { stringValue: selectedNet },
          address: { stringValue: payAddress },
          nowpaymentsPaymentId: { stringValue: paymentId },
          status: { stringValue: 'PENDING APPROVAL' },
          gateway: { stringValue: 'nowpayments' },
          gatewayStatus: { stringValue: npData.payment_status || 'waiting' },
          expiresAtMs: { integerValue: String(expiresAtMs) },
          createdAt: { timestampValue: new Date().toISOString() }
        }
      };

      const txRes = await fetch(firestoreUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(txPayload)
      });

      if (txRes.ok) {
        const txDoc = await txRes.json();
        transactionId = txDoc.name ? txDoc.name.split('/').pop() : null;
      }
    } catch (fsErr: any) {
      console.warn('Firestore initial registration warning:', fsErr.message);
    }

    return res.status(200).json({
      success: true,
      transactionId,
      expiresAt: expiresAtMs,
      paymentId,
      paymentStatus: npData.payment_status || 'waiting',
      payAddress,
      payAmount,
      payCurrency: npData.pay_currency,
      priceAmount: npData.price_amount,
      network: npData.network || selectedNet,
      validUntil: npData.valid_until || null
    });
  } catch (error: any) {
    console.error('Error in create-payment handler:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error while initializing payment.'
    });
  }
}
