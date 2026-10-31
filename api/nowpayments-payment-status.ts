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

async function queryTransactionDoc(paymentId: string | number, idToken: string) {
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

async function creditUserInFirestore(paymentId: string | number, txHash?: string, actuallyPaidAmount?: number, statusOverride?: string) {
  const idToken = await getServiceBotToken();
  const targetDoc = await queryTransactionDoc(paymentId, idToken);
  if (!targetDoc) return { success: false, message: 'Transaction not found' };

  const fields = targetDoc.fields || {};
  if (fields.status?.stringValue === 'APPROVED' || fields.gatewayCredited?.booleanValue === true) {
    return { success: true, alreadyProcessed: true };
  }

  const userId = fields.userId?.stringValue;
  if (!userId) throw new Error('Transaction missing userId');

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

  const userDocUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents/users/${userId}`;
  const userRes = await fetch(userDocUrl, {
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
  const userDoc = await userRes.json();
  const userFields = userDoc.fields || {};

  const currentBal = Number(userFields.balance?.doubleValue || userFields.balance?.integerValue || userFields.usdtBalance?.doubleValue || userFields.usdtBalance?.integerValue || 0);
  const updatedBalance = parseFloat((currentBal + creditedAmountUSD).toFixed(2));

  const commitUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents:commit`;
  const isDifferent = typeof actuallyPaidAmount === 'number' && Math.abs(creditedAmountUSD - expectedAmount) > 0.01;
  const txUpdates: Record<string, any> = {
    status: { stringValue: 'APPROVED' },
    gatewayStatus: { stringValue: statusOverride || 'finished' },
    gatewayCredited: { booleanValue: true },
    amount: { doubleValue: creditedAmountUSD }
  };

  if (actuallyPaidAmount) txUpdates.actuallyPaidCoin = { doubleValue: actuallyPaidAmount };
  if (txHash) txUpdates.txHash = { stringValue: txHash };
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

  await fetch(commitUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commitPayload)
  });

  return { success: true, creditedAmountUSD };
}

async function markExpiredInFirestore(paymentId: string | number, reason?: string) {
  const idToken = await getServiceBotToken();
  const targetDoc = await queryTransactionDoc(paymentId, idToken);
  if (!targetDoc) return { success: false };

  const fields = targetDoc.fields || {};
  if (fields.status?.stringValue === 'APPROVED' || fields.gatewayCredited?.booleanValue === true) {
    return { success: true, alreadyApproved: true };
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

  await fetch(commitUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commitPayload)
  });

  return { success: true };
}

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
    const npRes = await fetch(`https://api.nowpayments.io/v1/payment/${paymentId}`, {
      method: 'GET',
      headers: { 'x-api-key': NOWPAYMENTS_API_KEY }
    });

    if (!npRes.ok) {
      const err = await npRes.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch payment status for ID ${paymentId}`);
    }

    const payment = await npRes.json();
    const paymentStatus = payment.payment_status;
    const txHash = payment.payin_hash || payment.payout_hash;
    const actuallyPaid = (payment.actually_paid !== undefined && payment.actually_paid !== null) 
      ? parseFloat(payment.actually_paid) 
      : undefined;

    let credited = false;
    if (paymentStatus === 'finished' || paymentStatus === 'confirmed' || (paymentStatus === 'partially_paid' && actuallyPaid && actuallyPaid > 0)) {
      await creditUserInFirestore(paymentId, txHash, actuallyPaid, paymentStatus)
        .then(() => { credited = true; })
        .catch(e => console.warn('Credit check warning:', e.message));
    } else if ((paymentStatus === 'expired' || paymentStatus === 'failed') && (!actuallyPaid || actuallyPaid <= 0)) {
      await markExpiredInFirestore(paymentId, 'Payment session expired with no funds detected on blockchain.')
        .catch(e => console.warn('Expire check warning:', e.message));
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
