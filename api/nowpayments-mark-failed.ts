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

    const idToken = await getServiceBotToken();
    const targetDoc = await queryTransactionDoc(paymentId, idToken);

    if (!targetDoc) {
      return res.status(200).json({
        success: false,
        message: `Transaction record not found for payment ID: ${paymentId}`
      });
    }

    const fields = targetDoc.fields || {};
    if (fields.status?.stringValue === 'APPROVED' || fields.gatewayCredited?.booleanValue === true) {
      return res.status(200).json({
        success: true,
        alreadyApproved: true
      });
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

    const commitRes = await fetch(commitUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commitPayload)
    });

    return res.status(200).json({
      success: commitRes.ok,
      transactionId: targetDoc.name.split('/').pop()
    });
  } catch (err: any) {
    console.error('Error marking payment as failed/expired:', err);
    return res.status(500).json({
      error: err.message || 'Failed to mark payment as failed.'
    });
  }
}
