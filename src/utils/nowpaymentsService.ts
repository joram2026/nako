import crypto from 'crypto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  getFirestore, doc, collection, runTransaction, 
  serverTimestamp, query, where, getDocs 
} from 'firebase/firestore';
import firebaseConfig from '../firebaseConfig';
import { ReferralDepositConfig } from '../types';

export const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || 'PYDXSBF-NDHMQTS-GKV2KA5-YF3VFGK';
export const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || 'cAIzE0sz+yrQmfQ0fgSi5kBFWUBwGs+E';
const NOWPAYMENTS_BASE_URL = 'https://api.nowpayments.io/v1';

// Service bot credentials for automated backend Firestore updates
const SERVICE_BOT_EMAIL = 'service-bot@longpay.internal';
const SERVICE_BOT_PASS = 'SystemGateway2026!Secure';

export function getFirebaseInstance() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  return { app, auth, db };
}

export async function getAuthenticatedFirebase() {
  const { app, auth, db } = getFirebaseInstance();
  if (!auth.currentUser) {
    try {
      await signInWithEmailAndPassword(auth, SERVICE_BOT_EMAIL, SERVICE_BOT_PASS);
    } catch (err: any) {
      console.warn('Service bot sign in notification:', err?.message || err);
    }
  }
  return { app, auth, db };
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
    return 'usdc'; // Default Ethereum ERC20
  }

  // USDT variants
  if (normNet.includes('TRC20') || normNet.includes('TRON') || normNet === 'TRX') return 'usdttrc20';
  if (normNet.includes('BEP20') || normNet.includes('BSC') || normNet.includes('BNB')) return 'usdtbsc';
  if (normNet.includes('SOL') || normNet.includes('SOLANA')) return 'usdtsol';
  if (normNet.includes('POLYGON') || normNet.includes('MATIC')) return 'usdtmatic';
  if (normNet.includes('ARB') || normNet.includes('ARBITRUM')) return 'usdtarb';
  if (normNet.includes('TON')) return 'usdtton';
  return 'usdterc20'; // Default ERC20
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
    throw new Error(data.message || data.error || 'Failed to create payment with NOWPayments.');
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
 * Automatically credits the user's wallet in Firestore and awards first-deposit referral bonuses
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
  const { auth, db } = getFirebaseInstance();

  // 1. Authenticate server-side as service-bot
  try {
    await signInWithEmailAndPassword(auth, SERVICE_BOT_EMAIL, SERVICE_BOT_PASS);
  } catch (err: any) {
    console.warn('Service bot sign in notification:', err?.message || err);
  }

  // 2. Query transactions collection for this nowpaymentsPaymentId or ID
  const strPaymentId = String(paymentId);
  const txCol = collection(db, 'transactions');
  const q = query(txCol, where('nowpaymentsPaymentId', '==', strPaymentId));
  const snap = await getDocs(q);

  let targetTxDoc = snap.empty ? null : snap.docs[0];

  // Fallback: check if the document ID itself is paymentId or starts with it
  if (!targetTxDoc) {
    const qOrder = query(txCol, where('paymentId', '==', strPaymentId));
    const snapOrder = await getDocs(qOrder);
    if (!snapOrder.empty) targetTxDoc = snapOrder.docs[0];
  }

  if (!targetTxDoc) {
    return {
      success: false,
      message: `Transaction record not found for payment ID: ${strPaymentId}`
    };
  }

  const txData = targetTxDoc.data();
  const txRef = targetTxDoc.ref;

  // 3. Idempotency Check: if already approved, do not double-credit
  if (txData.status === 'APPROVED' || txData.gatewayCredited === true) {
    return {
      success: true,
      alreadyProcessed: true,
      userId: txData.userId,
      amount: txData.amount
    };
  }

  const userId = txData.userId;
  const userRef = doc(db, 'users', userId);

  // 4. Run atomic Firestore transaction to credit balance & referral perks
  let creditedAmountUSD = Number(txData.amount || 0);
  if (typeof actuallyPaidAmount === 'number' && actuallyPaidAmount > 0) {
    const expectedCoin = Number(txData.coinAmount || txData.payAmount || 0);
    const expectedUSD = Number(txData.amount || txData.priceAmount || 0);

    if (expectedCoin > 0 && expectedUSD > 0) {
      // Proportional calculation for over/under-payment, e.g. (98.5 USDT / 100 USDT) * $100 = $98.50 USD
      creditedAmountUSD = parseFloat(((actuallyPaidAmount / expectedCoin) * expectedUSD).toFixed(2));
    } else {
      creditedAmountUSD = parseFloat(actuallyPaidAmount.toFixed(2));
    }
  }

  await runTransaction(db, async (t) => {
    const userSnap = await t.get(userRef);
    if (!userSnap.exists()) {
      throw new Error(`User ${userId} not found in Firestore.`);
    }

    const userData = userSnap.data();
    const isFirstDeposit = !userData.hasMadeFirstDeposit;

    // Read referral deposit config
    let referralConfig: ReferralDepositConfig | null = null;
    const configDocRef = doc(db, 'settings', 'referral_deposit_config');
    const configSnap = await t.get(configDocRef);
    if (configSnap.exists()) {
      referralConfig = configSnap.data() as ReferralDepositConfig;
    }

    // Read referrer data if applicable
    let referrerUid: string | null = null;
    let referrerRef: any = null;
    let referrerData: any = null;

    if (isFirstDeposit && userData.referralSource && userData.referralSource.trim().length > 0) {
      const refCodeStr = userData.referralSource.trim().toUpperCase();
      const refMappingRef = doc(db, 'referralCodes', refCodeStr);
      const refMappingSnap = await t.get(refMappingRef);

      if (refMappingSnap.exists()) {
        const mappedUid = refMappingSnap.data().uid;
        if (mappedUid && mappedUid !== userId) {
          const rRef = doc(db, 'users', mappedUid);
          const rSnap = await t.get(rRef);
          if (rSnap.exists()) {
            referrerUid = mappedUid;
            referrerRef = rRef;
            referrerData = rSnap.data();
          }
        }
      }
    }

    // Compute updated user balance
    const currentBal = Number(userData.balance ?? userData.usdtBalance ?? 0);
    const updatedBalance = parseFloat((currentBal + creditedAmountUSD).toFixed(2));

    const userUpdates: Record<string, any> = {
      balance: updatedBalance,
      usdtBalance: updatedBalance,
      hasMadeFirstDeposit: true,
      lastDepositAt: serverTimestamp()
    };

    // Credit Welcome Bonus & Referrer Commission if qualified
    if (isFirstDeposit && referralConfig && referralConfig.enabled && creditedAmountUSD >= (referralConfig.minDepositThresholdUSD || 0)) {
      let referrerPct = 0;
      let refereePct = 0;

      if (referralConfig.tiers && referralConfig.tiers.length > 0) {
        const matchedTier = referralConfig.tiers.find(
          tier => creditedAmountUSD >= tier.minAmount && creditedAmountUSD <= tier.maxAmount
        );
        if (matchedTier) {
          referrerPct = matchedTier.referrerPercent;
          refereePct = matchedTier.refereePercent;
        }
      }

      // 1. Referee Welcome Bonus
      const welcomeBonusAmount = parseFloat(((creditedAmountUSD * refereePct) / 100).toFixed(2));
      if (welcomeBonusAmount > 0) {
        userUpdates.balance = parseFloat((userUpdates.balance + welcomeBonusAmount).toFixed(2));
        userUpdates.usdtBalance = userUpdates.balance;

        const welcomeTxRef = doc(collection(db, 'transactions'));
        t.set(welcomeTxRef, {
          id: welcomeTxRef.id,
          userId: userId,
          userEmail: userData.email || '',
          type: 'welcome_bonus',
          amount: welcomeBonusAmount,
          status: 'APPROVED',
          createdAt: serverTimestamp(),
          paymentMessage: `First Deposit Welcome Bonus (${refereePct}% of $${creditedAmountUSD.toFixed(2)} deposit)`
        });
      }

      // 2. Referrer Commission & 24h Extra Signal Pass
      if (referrerUid && referrerRef && referrerData) {
        const commissionAmount = parseFloat(((creditedAmountUSD * referrerPct) / 100).toFixed(2));
        const nowMs = Date.now();
        let baseExpiryMs = nowMs;
        if (referrerData.extraSignalPassUntil) {
          const passSeconds = referrerData.extraSignalPassUntil.seconds 
            ? referrerData.extraSignalPassUntil.seconds * 1000 
            : new Date(referrerData.extraSignalPassUntil).getTime();
          if (passSeconds > nowMs) {
            baseExpiryMs = passSeconds;
          }
        }
        const newExpiryDate = new Date(baseExpiryMs + (24 * 60 * 60 * 1000));
        const referrerUpdates: Record<string, any> = {
          extraSignalPassUntil: newExpiryDate
        };

        if (commissionAmount > 0) {
          const currentRefBal = Number(referrerData.balance ?? referrerData.usdtBalance ?? 0);
          const newRefBal = parseFloat((currentRefBal + commissionAmount).toFixed(2));
          referrerUpdates.balance = newRefBal;
          referrerUpdates.usdtBalance = newRefBal;

          const commTxRef = doc(collection(db, 'transactions'));
          t.set(commTxRef, {
            id: commTxRef.id,
            userId: referrerUid,
            userEmail: referrerData.email || 'Referrer',
            type: 'first_deposit_commission',
            amount: commissionAmount,
            status: 'APPROVED',
            createdAt: serverTimestamp(),
            paymentMessage: `Referral First Deposit Bonus (${referrerPct}% of $${creditedAmountUSD.toFixed(2)} deposit by ${userData.email}) + 24h Extra Signal Pass`
          });
        }
        t.update(referrerRef, referrerUpdates);
      }
    }

    // Apply User updates
    t.update(userRef, userUpdates);

    // Update Transaction Document to APPROVED
    const isDifferentAmount = typeof actuallyPaidAmount === 'number' && Math.abs(creditedAmountUSD - Number(txData.amount || 0)) > 0.01;
    t.update(txRef, {
      status: 'APPROVED',
      gatewayStatus: statusOverride || 'finished',
      gatewayCredited: true,
      amount: creditedAmountUSD,
      actuallyPaidCoin: typeof actuallyPaidAmount === 'number' ? actuallyPaidAmount : (txData.coinAmount || null),
      txHash: txHash || txData.txHash || null,
      paymentMessage: isDifferentAmount
        ? `Credited actual amount received: $${creditedAmountUSD.toFixed(2)} USD (${actuallyPaidAmount} ${txData.coinSymbol || ''})`
        : (txData.paymentMessage || null),
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  return {
    success: true,
    creditedAmountUSD,
    userId,
    transactionId: targetTxDoc.id
  };
}

/**
 * Marks a deposit transaction as FAILED in Firestore when payment window expires with no payment
 */
export async function markPaymentExpiredInFirestore({
  paymentId,
  reason
}: {
  paymentId: string | number;
  reason?: string;
}) {
  const { auth, db } = getFirebaseInstance();

  try {
    await signInWithEmailAndPassword(auth, SERVICE_BOT_EMAIL, SERVICE_BOT_PASS);
  } catch (err: any) {
    console.warn('Service bot sign in notification:', err?.message || err);
  }

  const strPaymentId = String(paymentId);
  const txCol = collection(db, 'transactions');
  const q = query(txCol, where('nowpaymentsPaymentId', '==', strPaymentId));
  const snap = await getDocs(q);

  let targetTxDoc = snap.empty ? null : snap.docs[0];

  if (!targetTxDoc) {
    const qOrder = query(txCol, where('paymentId', '==', strPaymentId));
    const snapOrder = await getDocs(qOrder);
    if (!snapOrder.empty) targetTxDoc = snapOrder.docs[0];
  }

  if (!targetTxDoc) {
    return {
      success: false,
      message: `Transaction record not found for payment ID: ${strPaymentId}`
    };
  }

  const txData = targetTxDoc.data();

  // If already approved, do not fail
  if (txData.status === 'APPROVED' || txData.gatewayCredited === true) {
    return {
      success: true,
      alreadyApproved: true
    };
  }

  const { updateDoc } = await import('firebase/firestore');
  await updateDoc(targetTxDoc.ref, {
    status: 'FAILED',
    gatewayStatus: 'expired',
    failedReason: reason || 'Payment duration expired with no payment detected on blockchain.',
    failedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    success: true,
    transactionId: targetTxDoc.id,
    paymentId: strPaymentId
  };
}
