import crypto from 'crypto';

export const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || 'PYDXSBF-NDHMQTS-GKV2KA5-YF3VFGK';
export const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || 'cAIzE0sz+yrQmfQ0fgSi5kBFWUBwGs+E';
const NOWPAYMENTS_BASE_URL = 'https://api.nowpayments.io/v1';

// Firebase Project & Database Info for ultra-lightweight REST API
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'paylon-766c0';
const FIREBASE_DATABASE_ID = process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'ai-studio-longpay-2d2973a8-89cc-4824-992f-b98cf1352817';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCMYK5YYczaMxFx8EutLD4HNXVO2nu6Jn4';

// Service bot credentials for automated backend Firestore updates
const SERVICE_BOT_EMAIL = 'service-bot@longpay.internal';
const SERVICE_BOT_PASS = 'SystemGateway2026!Secure';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Retrieves a fresh Google Identity token for service-bot via Firebase Auth REST API.
 * Uses 0 external SDKs, guaranteeing 100% compatibility across all serverless environments (Vercel, AWS Lambda, Node).
 */
export async function getServiceBotToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: SERVICE_BOT_EMAIL,
      password: SERVICE_BOT_PASS,
      returnSecureToken: true
    })
  });

  const data = await res.json();
  if (!data.idToken) {
    throw new Error(data.error?.message || 'Failed to authenticate service bot via REST API');
  }

  cachedToken = data.idToken;
  tokenExpiresAt = now + (parseInt(data.expiresIn || '3600', 10) * 1000);
  return cachedToken;
}

/**
 * Maps frontend network names & coin symbols to NOWPayments coin tickers
 */
export function mapNetworkToNowPaymentsTicker(network: string, coinSymbol: string): string {
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

/**
 * Creates an automated crypto payment address with NOWPayments
 */
export async function createNowPaymentsPayment({
  amountUSD,
  network,
  coinSymbol,
  orderId,
  userEmail,
  callbackUrl
}: {
  amountUSD: number;
  network: string;
  coinSymbol: string;
  orderId: string;
  userEmail: string;
  callbackUrl?: string;
}) {
  const payCurrency = mapNetworkToNowPaymentsTicker(network, coinSymbol);
  
  const payload: Record<string, any> = {
    price_amount: amountUSD,
    price_currency: 'usd',
    pay_currency: payCurrency,
    order_id: orderId,
    order_description: `Deposit ${amountUSD} USD for ${userEmail}`,
    is_fee_paid_by_user: false
  };

  if (callbackUrl) {
    payload.ipn_callback_url = callbackUrl;
  }

  const response = await fetch(`${NOWPAYMENTS_BASE_URL}/payment`, {
    method: 'POST',
    headers: {
      'x-api-key': NOWPAYMENTS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to create automated deposit payment.');
  }

  return {
    paymentId: String(data.payment_id),
    paymentStatus: data.payment_status || 'waiting',
    payAddress: data.pay_address,
    payAmount: data.pay_amount,
    payCurrency: data.pay_currency,
    priceAmount: data.price_amount,
    network: data.network || network,
    validUntil: data.valid_until || data.expiration_estimate_date || null
  };
}

/**
 * Checks the live on-chain status of a payment directly from NOWPayments
 */
export async function fetchNowPaymentsStatus(paymentId: string | number) {
  const response = await fetch(`${NOWPAYMENTS_BASE_URL}/payment/${paymentId}`, {
    method: 'GET',
    headers: {
      'x-api-key': NOWPAYMENTS_API_KEY
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch payment status for ID ${paymentId}`);
  }

  return await response.json();
}

/**
 * Verifies the incoming Instant Payment Notification (IPN) HMAC-SHA512 signature
 */
export function verifyNowPaymentsSignature(payload: any, signature: string): boolean {
  if (!signature || !payload) return false;

  try {
    const sortedKeys = Object.keys(payload).sort();
    const sortedObj: Record<string, any> = {};
    for (const key of sortedKeys) {
      sortedObj[key] = payload[key];
    }
    const jsonStr = JSON.stringify(sortedObj);
    const hmac = crypto.createHmac('sha512', NOWPAYMENTS_IPN_SECRET);
    hmac.update(jsonStr);
    const computedSignature = hmac.digest('hex');

    return computedSignature.toLowerCase() === signature.toLowerCase();
  } catch (err) {
    console.error('Error verifying NOWPayments IPN signature:', err);
    return false;
  }
}

/**
 * Helper to query a transaction document by nowpaymentsPaymentId using Firestore REST API
 */
async function queryTransactionDocByPaymentId(paymentId: string | number, idToken: string) {
  const strId = String(paymentId);
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents:runQuery`;
  
  const queryPayload = {
    structuredQuery: {
      from: [{ collectionId: 'transactions' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'nowpaymentsPaymentId' },
          op: 'EQUAL',
          value: { stringValue: strId }
        }
      },
      limit: 1
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(queryPayload)
  });

  const results = await res.json();
  if (Array.isArray(results) && results[0]?.document) {
    return results[0].document;
  }
  return null;
}

/**
 * Automatically credits the user's wallet in Firestore and finishes transaction via Firestore REST API
 */
export async function finalizePaymentCreditInFirestore({
  paymentId,
  txHash,
  actuallyPaidAmount,
  statusOverride
}: {
  paymentId: string | number;
  txHash?: string;
  actuallyPaidAmount?: number;
  statusOverride?: string;
}) {
  const idToken = await getServiceBotToken();
  const targetDoc = await queryTransactionDocByPaymentId(paymentId, idToken);

  if (!targetDoc) {
    return {
      success: false,
      message: `Transaction record not found for payment ID: ${paymentId}`
    };
  }

  const fields = targetDoc.fields || {};
  const currentStatus = fields.status?.stringValue;
  const isAlreadyCredited = fields.gatewayCredited?.booleanValue;

  if (currentStatus === 'APPROVED' || isAlreadyCredited === true) {
    return {
      success: true,
      alreadyProcessed: true,
      userId: fields.userId?.stringValue
    };
  }

  const userId = fields.userId?.stringValue;
  if (!userId) {
    throw new Error('Transaction does not contain a valid userId');
  }

  // Expected vs actual amounts
  const expectedAmount = Number(fields.amount?.integerValue || fields.amount?.doubleValue || 0);
  const expectedCoin = Number(fields.coinAmount?.doubleValue || fields.coinAmount?.integerValue || fields.payAmount?.doubleValue || expectedAmount);

  let creditedAmountUSD = expectedAmount;
  if (typeof actuallyPaidAmount === 'number' && actuallyPaidAmount > 0) {
    if (expectedCoin > 0 && expectedAmount > 0) {
      creditedAmountUSD = parseFloat(((actuallyPaidAmount / expectedCoin) * expectedAmount).toFixed(2));
    } else {
      creditedAmountUSD = parseFloat(actuallyPaidAmount.toFixed(2));
    }
  }

  // Read current user profile
  const userDocUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents/users/${userId}`;
  const userRes = await fetch(userDocUrl, {
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
  const userDoc = await userRes.json();
  const userFields = userDoc.fields || {};

  const currentBal = Number(userFields.balance?.doubleValue || userFields.balance?.integerValue || userFields.usdtBalance?.doubleValue || userFields.usdtBalance?.integerValue || 0);
  const updatedBalance = parseFloat((currentBal + creditedAmountUSD).toFixed(2));

  // Atomic commit update for User balance and Transaction document
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents:commit`;
  
  const isDifferent = typeof actuallyPaidAmount === 'number' && Math.abs(creditedAmountUSD - expectedAmount) > 0.01;
  const txUpdates: Record<string, any> = {
    status: { stringValue: 'APPROVED' },
    gatewayStatus: { stringValue: statusOverride || 'finished' },
    gatewayCredited: { booleanValue: true },
    amount: { doubleValue: creditedAmountUSD }
  };

  if (actuallyPaidAmount) {
    txUpdates.actuallyPaidCoin = { doubleValue: actuallyPaidAmount };
  }
  if (txHash) {
    txUpdates.txHash = { stringValue: txHash };
  }
  if (isDifferent) {
    txUpdates.paymentMessage = {
      stringValue: `Credited actual amount received: $${creditedAmountUSD.toFixed(2)} USD (${actuallyPaidAmount} crypto)`
    };
  }

  const commitPayload = {
    writes: [
      {
        update: {
          name: userDoc.name,
          fields: {
            ...userFields,
            balance: { doubleValue: updatedBalance },
            usdtBalance: { doubleValue: updatedBalance },
            hasMadeFirstDeposit: { booleanValue: true }
          }
        },
        updateMask: {
          fieldPaths: ['balance', 'usdtBalance', 'hasMadeFirstDeposit']
        }
      },
      {
        update: {
          name: targetDoc.name,
          fields: {
            ...fields,
            ...txUpdates
          }
        },
        updateMask: {
          fieldPaths: Object.keys(txUpdates)
        }
      }
    ]
  };

  const commitRes = await fetch(commitUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commitPayload)
  });

  if (!commitRes.ok) {
    const errData = await commitRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to commit credit updates to Firestore');
  }

  return {
    success: true,
    creditedAmountUSD,
    userId,
    transactionId: targetDoc.name.split('/').pop()
  };
}

/**
 * Marks a deposit transaction as FAILED in Firestore via REST API when payment window expires with no payment
 */
export async function markPaymentExpiredInFirestore({
  paymentId,
  reason
}: {
  paymentId: string | number;
  reason?: string;
}) {
  const idToken = await getServiceBotToken();
  const targetDoc = await queryTransactionDocByPaymentId(paymentId, idToken);

  if (!targetDoc) {
    return {
      success: false,
      message: `Transaction record not found for payment ID: ${paymentId}`
    };
  }

  const fields = targetDoc.fields || {};
  if (fields.status?.stringValue === 'APPROVED' || fields.gatewayCredited?.booleanValue === true) {
    return {
      success: true,
      alreadyApproved: true
    };
  }

  const commitUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents:commit`;
  const commitPayload = {
    writes: [
      {
        update: {
          name: targetDoc.name,
          fields: {
            ...fields,
            status: { stringValue: 'FAILED' },
            gatewayStatus: { stringValue: 'expired' },
            failedReason: { stringValue: reason || 'Payment duration expired with no funds detected.' }
          }
        },
        updateMask: {
          fieldPaths: ['status', 'gatewayStatus', 'failedReason']
        }
      }
    ]
  };

  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commitPayload)
  });

  return {
    success: res.ok,
    transactionId: targetDoc.name.split('/').pop()
  };
}
