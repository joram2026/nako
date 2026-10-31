import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { 
  collection, addDoc, doc, serverTimestamp, 
  onSnapshot, query, where, getDoc 
} from 'firebase/firestore';
import { CryptoNetwork, Transaction, UserAccount, CryptoPrice, ReferralDepositConfig } from '../types';
import { 
  ArrowLeft, Check, Copy, AlertCircle, RefreshCw,
  Clock, ShieldCheck, Shield, CheckCircle2,
  Sparkles, Zap, QrCode, ExternalLink, ChevronDown, ChevronUp, UploadCloud
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { CoinBadge3D, NetworkBadgeOverlay } from './DepositIcons';

interface NetworkOption {
  networkKey: string;
  name: string;
  minDepositCoin: number;
  minDepositUSD: number;
  minDepositFormatted: string;
  speed: string;
  isLowerFee: boolean;
  defaultAddress: string;
}

function formatNetworkMeta(rawKey: string): { key: string; name: string; speed: string; isLowerFee: boolean } {
  const norm = (rawKey || '').toUpperCase().trim();

  if (norm.includes('TRC20') || norm.includes('TRON') || norm === 'TRX') {
    return { key: 'TRC20', name: 'Tron', speed: '1m', isLowerFee: true };
  }
  if (norm.includes('BEP20') || norm.includes('BSC') || norm.includes('BINANCE') || norm === 'BNB') {
    return { key: 'BEP20', name: 'BNB Smart Chain', speed: '2m', isLowerFee: true };
  }
  if (norm.includes('ERC20') || norm.includes('ETHEREUM') || norm === 'ETH') {
    return { key: 'ERC20', name: 'Ethereum', speed: '5m', isLowerFee: false };
  }
  if (norm.includes('SOL') || norm.includes('SPL') || norm.includes('SOLANA')) {
    return { key: 'SOL', name: 'Solana', speed: '1m', isLowerFee: true };
  }
  if (norm.includes('POLYGON') || norm.includes('MATIC')) {
    return { key: 'POLYGON', name: 'Polygon', speed: '2m', isLowerFee: true };
  }
  if (norm.includes('ARBITRUM') || norm.includes('ARB')) {
    return { key: 'ARBITRUM', name: 'Arbitrum One', speed: '2m', isLowerFee: true };
  }
  if (norm.includes('TON')) {
    return { key: 'TON', name: 'TON', speed: '1m', isLowerFee: true };
  }

  return {
    key: rawKey.toUpperCase(),
    name: rawKey,
    speed: '3m',
    isLowerFee: true
  };
}

const DEFAULT_SUPPORTED_NETWORKS: Record<string, NetworkOption[]> = {
  USDT: [
    {
      networkKey: 'BEP20',
      name: 'BNB Smart Chain',
      minDepositCoin: 5,
      minDepositUSD: 5,
      minDepositFormatted: '5 USDT (5 USD)',
      speed: '2m',
      isLowerFee: true,
      defaultAddress: ''
    },
    {
      networkKey: 'TRC20',
      name: 'Tron',
      minDepositCoin: 12,
      minDepositUSD: 12,
      minDepositFormatted: '12 USDT (12 USD)',
      speed: '1m',
      isLowerFee: true,
      defaultAddress: ''
    },
    {
      networkKey: 'SOL',
      name: 'Solana',
      minDepositCoin: 5,
      minDepositUSD: 5,
      minDepositFormatted: '5 USDT (5 USD)',
      speed: '1m',
      isLowerFee: true,
      defaultAddress: ''
    },
    {
      networkKey: 'POLYGON',
      name: 'Polygon',
      minDepositCoin: 5,
      minDepositUSD: 5,
      minDepositFormatted: '5 USDT (5 USD)',
      speed: '2m',
      isLowerFee: true,
      defaultAddress: ''
    },
    {
      networkKey: 'ERC20',
      name: 'Ethereum',
      minDepositCoin: 20,
      minDepositUSD: 20,
      minDepositFormatted: '20 USDT (20 USD)',
      speed: '5m',
      isLowerFee: false,
      defaultAddress: ''
    }
  ],
  USDC: [
    {
      networkKey: 'BEP20',
      name: 'BNB Smart Chain',
      minDepositCoin: 5,
      minDepositUSD: 5,
      minDepositFormatted: '5 USDC (5 USD)',
      speed: '2m',
      isLowerFee: true,
      defaultAddress: ''
    },
    {
      networkKey: 'SOL',
      name: 'Solana',
      minDepositCoin: 5,
      minDepositUSD: 5,
      minDepositFormatted: '5 USDC (5 USD)',
      speed: '1m',
      isLowerFee: true,
      defaultAddress: ''
    },
    {
      networkKey: 'POLYGON',
      name: 'Polygon',
      minDepositCoin: 5,
      minDepositUSD: 5,
      minDepositFormatted: '5 USDC (5 USD)',
      speed: '2m',
      isLowerFee: true,
      defaultAddress: ''
    },
    {
      networkKey: 'ERC20',
      name: 'Ethereum',
      minDepositCoin: 20,
      minDepositUSD: 20,
      minDepositFormatted: '20 USDC (20 USD)',
      speed: '5m',
      isLowerFee: false,
      defaultAddress: ''
    }
  ]
};

// Canvas Image Compressor for optional manual fallback receipt
function compressImageFile(file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

interface DepositWorkflowProps {
  user: any;
  onBack: () => void;
  onSuccess: () => void;
  initialCoinSymbol?: string;
}

interface NowPaymentsActiveOrder {
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  priceAmount: number;
  network: string;
  paymentStatus: string;
  transactionId?: string;
}

export default function DepositWorkflow({
  user,
  onBack,
  onSuccess,
  initialCoinSymbol
}: DepositWorkflowProps) {
  const toast = useToast();

  const currentSymbol = useMemo(() => {
    const sym = (initialCoinSymbol || 'USDT').toUpperCase().trim();
    return sym === 'USDC' ? 'USDC' : 'USDT';
  }, [initialCoinSymbol]);

  // Steps: 'choose_network' -> 'payment_terminal'
  const [step, setStep] = useState<'choose_network' | 'payment_terminal'>('choose_network');
  const [networkFilter, setNetworkFilter] = useState<'all' | 'lower_fees'>('all');
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption | null>(null);

  // Deposit Amount (USD) - default set to 0
  const [amountUSDInput, setAmountUSDInput] = useState<string>('0');

  // Active NOWPayments Gateway Order
  const [activeOrder, setActiveOrder] = useState<NowPaymentsActiveOrder | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [pollingStatus, setPollingStatus] = useState<string>('waiting');
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [creditedAmount, setCreditedAmount] = useState<number>(0);
  const [actuallyPaidCrypto, setActuallyPaidCrypto] = useState<number | null>(null);

  // Firestore Networks & Settings
  const [firestoreNetworks, setFirestoreNetworks] = useState<CryptoNetwork[]>([]);
  const [referralConfig, setReferralConfig] = useState<ReferralDepositConfig | null>(null);

  // UI States
  const [copied, setCopied] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [showManualFallback, setShowManualFallback] = useState<boolean>(false);
  const [manualEvidence, setManualEvidence] = useState<string>('');
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState<boolean>(false);

  // Countdown timer for rate lock session
  const [expiresAt, setExpiresAt] = useState<number>(Date.now() + 20 * 60 * 1000);
  const [timeLeft, setTimeLeft] = useState<string>('20:00');
  const hasExpiredRef = useRef<boolean>(false);

  // Helper to persist / clear active order in localStorage
  const storageKey = `nowpayments_active_order_${user?.uid || 'guest'}`;

  const saveActiveOrderToStorage = (order: NowPaymentsActiveOrder, expiryMs: number) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...order, expiresAt: expiryMs }));
    } catch {}
  };

  const clearActiveOrderFromStorage = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  // Real-time listener for Firestore referral settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'referral_deposit_config'), (docSnap) => {
      if (docSnap.exists()) {
        setReferralConfig(docSnap.data() as ReferralDepositConfig);
      }
    }, () => {});
    return () => unsub();
  }, []);

  // Real-time listener for crypto_networks from admin panel
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'crypto_networks'), (snap) => {
      if (!snap.empty) {
        setFirestoreNetworks(snap.docs.map(d => ({ ...d.data(), id: d.id } as CryptoNetwork)));
      }
    }, () => {});
    return () => unsub();
  }, []);

  // Compute available network list for the selected coin
  const availableNetworks = useMemo<NetworkOption[]>(() => {
    const matched = firestoreNetworks.find(n => n.id.toLowerCase() === currentSymbol.toLowerCase());
    if (matched && Array.isArray(matched.networks) && matched.networks.length > 0) {
      return matched.networks.map(netKey => {
        const meta = formatNetworkMeta(netKey);
        const minUSD = typeof matched.minDepositUSD === 'number' && matched.minDepositUSD > 0
          ? matched.minDepositUSD
          : (meta.isLowerFee ? 5 : 10);
        return {
          networkKey: meta.key,
          name: meta.name,
          minDepositCoin: minUSD,
          minDepositUSD: minUSD,
          minDepositFormatted: `${minUSD} ${currentSymbol} ($${minUSD} USD)`,
          speed: meta.speed,
          isLowerFee: meta.isLowerFee,
          defaultAddress: matched.addresses?.[netKey] || ''
        };
      });
    }

    return DEFAULT_SUPPORTED_NETWORKS[currentSymbol] || DEFAULT_SUPPORTED_NETWORKS['USDT'];
  }, [currentSymbol, firestoreNetworks]);

  // Set default selected network on initial render
  useEffect(() => {
    if (!selectedNetwork && availableNetworks.length > 0) {
      setSelectedNetwork(availableNetworks[0]);
    }
  }, [availableNetworks, selectedNetwork]);

  const displayedNetworks = useMemo(() => {
    if (networkFilter === 'lower_fees') {
      return availableNetworks.filter(n => n.isLowerFee);
    }
    return availableNetworks;
  }, [availableNetworks, networkFilter]);

  // Check for active unexpired pending deposit in localStorage and Firestore on mount
  useEffect(() => {
    if (!user?.uid) return;

    // A. Check localStorage first
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.paymentId && parsed.expiresAt && parsed.expiresAt > Date.now()) {
          setActiveOrder(parsed);
          setExpiresAt(parsed.expiresAt);
          setCreditedAmount(parsed.priceAmount || 0);
          setStep('payment_terminal');
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch {}

    // B. Check Firestore for user's latest pending NOWPayments deposit
    const qPending = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      where('gateway', '==', 'nowpayments'),
      where('status', '==', 'PENDING APPROVAL')
    );

    const unsubPending = onSnapshot(qPending, (snap) => {
      if (!snap.empty && !isFinished) {
        const docs = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
        docs.sort((a, b) => {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
          return bTime - aTime;
        });

        const latestTx = docs[0];
        const txCreatedMs = latestTx.createdAt?.toMillis ? latestTx.createdAt.toMillis() : Date.now();
        const expiryMs = latestTx.expiresAtMs || (txCreatedMs + 20 * 60 * 1000);

        // If still within payment window and has paymentId
        if (latestTx.nowpaymentsPaymentId && expiryMs > Date.now()) {
          const restoredOrder: NowPaymentsActiveOrder = {
            paymentId: latestTx.nowpaymentsPaymentId,
            payAddress: latestTx.address || '',
            payAmount: latestTx.payAmount || latestTx.coinAmount || latestTx.amount,
            payCurrency: latestTx.coinSymbol || currentSymbol,
            priceAmount: latestTx.priceAmount || latestTx.amount,
            network: latestTx.network || 'Crypto',
            paymentStatus: latestTx.gatewayStatus || 'waiting',
            transactionId: latestTx.id
          };
          setActiveOrder(restoredOrder);
          setExpiresAt(expiryMs);
          setCreditedAmount(restoredOrder.priceAmount);
          saveActiveOrderToStorage(restoredOrder, expiryMs);
        }
      }
    }, () => {});

    return () => unsubPending();
  }, [user?.uid, storageKey, isFinished, currentSymbol]);

  // Rate lock countdown timer
  useEffect(() => {
    if (!activeOrder || isFinished || isExpired) return;

    const timer = setInterval(() => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00');
        if (!hasExpiredRef.current && !isFinished) {
          hasExpiredRef.current = true;
          handleExpirePayment();
        }
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, activeOrder, isFinished, isExpired]);

  // Handler when timer expires with no payment received
  const handleExpirePayment = async () => {
    if (!activeOrder || isFinished) return;
    setIsExpired(true);
    clearActiveOrderFromStorage();

    try {
      await fetch('/api/nowpayments/mark-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: activeOrder.paymentId,
          reason: '20-minute rate lock window expired without receiving funds.'
        })
      });
      toast.info('Payment window expired. Transaction marked as failed.', 'Session Expired');
    } catch (e) {
      console.warn('Expire call warning:', e);
    }
  };

  // Handler to cancel pending session and start fresh
  const handleCancelAndStartFresh = async () => {
    if (!activeOrder) {
      setStep('choose_network');
      return;
    }

    setIsCancellingOrder(true);
    try {
      await fetch('/api/nowpayments/mark-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: activeOrder.paymentId,
          reason: 'User cancelled payment session to start a new deposit.'
        })
      });
      clearActiveOrderFromStorage();
      setActiveOrder(null);
      setIsExpired(false);
      setIsFinished(false);
      setPollingStatus('waiting');
      setAmountUSDInput('0');
      setStep('choose_network');
      toast.info('Previous pending session cancelled. You can now start a new deposit.');
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      clearActiveOrderFromStorage();
      setActiveOrder(null);
      setStep('choose_network');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  // Copy address helper
  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Deposit address copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  // 1. Create Automated Payment Order via NOWPayments
  const handleInitiateAutomatedPayment = async () => {
    const numAmount = parseFloat(amountUSDInput);
    const minUSD = selectedNetwork?.minDepositUSD || 5;

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorState('Please enter an amount greater than $0.');
      toast.error('Please enter a deposit amount greater than $0.');
      return;
    }

    if (numAmount < minUSD) {
      setErrorState(`Minimum deposit for ${selectedNetwork?.name || 'this network'} is $${minUSD} USD.`);
      toast.error(`Minimum deposit for ${selectedNetwork?.name} is $${minUSD} USD.`);
      return;
    }

    setIsCreatingOrder(true);
    setErrorState(null);

    try {
      const res = await fetch('/api/nowpayments/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          amountUSD: numAmount,
          network: selectedNetwork?.networkKey || 'BEP20',
          coinSymbol: currentSymbol
        })
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(rawText && rawText.length < 150 ? rawText : `Server returned status ${res.status}. Please check gateway setup.`);
      }

      if (!res.ok || !data.payAddress) {
        throw new Error(data.error || data.message || 'Failed to initialize automated payment gateway.');
      }

      const orderExpiry = data.expiresAt || (Date.now() + 20 * 60 * 1000);
      const newOrder: NowPaymentsActiveOrder = {
        paymentId: data.paymentId,
        payAddress: data.payAddress,
        payAmount: data.payAmount,
        payCurrency: data.payCurrency,
        priceAmount: data.priceAmount,
        network: data.network || selectedNetwork?.name || 'Crypto',
        paymentStatus: data.paymentStatus || 'waiting',
        transactionId: data.transactionId
      };

      hasExpiredRef.current = false;
      setActiveOrder(newOrder);
      setCreditedAmount(data.priceAmount);
      setPollingStatus(data.paymentStatus || 'waiting');
      setExpiresAt(orderExpiry);
      setIsExpired(false);
      setIsFinished(false);
      saveActiveOrderToStorage(newOrder, orderExpiry);
      setStep('payment_terminal');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error starting automated deposit:', err);
      setErrorState(err.message || 'Unable to connect to NOWPayments gateway.');
      toast.error(err.message || 'Unable to start deposit.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // 2. Real-time Status Polling & Firestore listener
  useEffect(() => {
    if (step !== 'payment_terminal' || !activeOrder || isFinished || isExpired) return;

    // Check payment status with backend
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/nowpayments/payment-status?paymentId=${activeOrder.paymentId}`);
        if (res.ok) {
          const rawText = await res.text();
          let data: any = {};
          try {
            data = JSON.parse(rawText);
          } catch {
            return;
          }
          const status = data.paymentStatus || 'waiting';
          setPollingStatus(status);

          // Detect actual crypto sent (partial or overpaid)
          if (data.actuallyPaid !== undefined && data.actuallyPaid !== null) {
            const actualNum = parseFloat(data.actuallyPaid);
            setActuallyPaidCrypto(actualNum);
            if (actualNum > 0 && activeOrder.payAmount > 0) {
              const calcUSD = parseFloat(((actualNum / activeOrder.payAmount) * activeOrder.priceAmount).toFixed(2));
              setCreditedAmount(calcUSD);
            }
          }

          if (data.isFinished || status === 'finished' || status === 'confirmed' || status === 'partially_paid') {
            setIsFinished(true);
            clearActiveOrderFromStorage();
            toast.success(`Deposit confirmed! Your account is credited.`, 'Deposit Successful');
          } else if (data.isExpired || status === 'expired' || status === 'failed') {
            setIsExpired(true);
            clearActiveOrderFromStorage();
          }
        }
      } catch (e) {
        console.warn('Status poll warning:', e);
      }
    };

    // Immediate check
    checkStatus();

    // Poll every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    // Also listen to the transaction document in Firestore for real-time status update
    let unsubTx: (() => void) | null = null;
    if (activeOrder.transactionId) {
      unsubTx = onSnapshot(doc(db, 'transactions', activeOrder.transactionId), (snap) => {
        if (snap.exists()) {
          const txData = snap.data();
          if (txData.status === 'APPROVED' || txData.gatewayCredited === true) {
            setIsFinished(true);
            setPollingStatus('finished');
            clearActiveOrderFromStorage();
            if (txData.amount) {
              setCreditedAmount(Number(txData.amount));
            }
            if (txData.actuallyPaidCoin) {
              setActuallyPaidCrypto(Number(txData.actuallyPaidCoin));
            }
          } else if (txData.status === 'FAILED') {
            setIsExpired(true);
            clearActiveOrderFromStorage();
          }
        }
      });
    }

    return () => {
      clearInterval(interval);
      if (unsubTx) unsubTx();
    };
  }, [step, activeOrder?.paymentId, activeOrder?.transactionId, isFinished, isExpired]);

  // Manual Refresh Button Handler
  const handleManualStatusCheck = async () => {
    if (!activeOrder || isCheckingStatus) return;
    setIsCheckingStatus(true);
    try {
      const res = await fetch(`/api/nowpayments/payment-status?paymentId=${activeOrder.paymentId}`);
      if (res.ok) {
        const rawText = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(rawText);
        } catch {
          toast.error('Unable to parse gateway response.');
          return;
        }
        const status = data.paymentStatus || 'waiting';
        setPollingStatus(status);
        if (data.isFinished || status === 'finished' || status === 'confirmed') {
          setIsFinished(true);
          toast.success(`Payment confirmed! Your account is credited.`, 'Deposit Confirmed');
        } else {
          toast.info(`Status: ${status.toUpperCase()}. Checking blockchain confirmations...`);
        }
      }
    } catch (e: any) {
      toast.error('Unable to verify status right now.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // QR Code Image URL using active deposit address
  const qrCodeUrl = useMemo(() => {
    if (!activeOrder?.payAddress) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeOrder.payAddress)}`;
  }, [activeOrder?.payAddress]);

  // Fallback image change handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImageFile(file, 1000, 1000, 0.75);
        setManualEvidence(compressedBase64);
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => setManualEvidence(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  // Fallback Manual Submit
  const handleFallbackSubmit = async () => {
    if (!activeOrder || !manualEvidence) {
      toast.error('Please upload a screenshot of your transfer proof.');
      return;
    }
    setIsSubmittingManual(true);
    try {
      if (activeOrder.transactionId) {
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'transactions', activeOrder.transactionId), {
          evidence: manualEvidence,
          hasManualProof: true,
          submittedProofAt: serverTimestamp()
        });
      }
      toast.success('Receipt uploaded. The gateway is monitoring your on-chain settlement.', 'Receipt Attached');
      setShowManualFallback(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload screenshot.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  return (
    <div 
      id="deposit-page-root" 
      className="min-h-screen bg-[#f4f5f8] text-slate-900 pb-20 pt-4 px-4 sm:px-6 transition-colors font-sans"
    >
      <div className="max-w-xl mx-auto space-y-5">
        
        {/* ========================================================================= */}
        {/* STEP 1: CHOOSE NETWORK & ENTER AMOUNT                                      */}
        {/* ========================================================================= */}
        {step === 'choose_network' && (
          <div className="animate-fadeIn space-y-4" id="choose-network-view">
            {/* Top Navigation */}
            <div className="flex items-center">
              <button 
                id="deposit-choose-network-back-btn"
                onClick={onBack}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs"
                title="Back"
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Active Deposit Resumption Banner */}
            {activeOrder && !isFinished && !isExpired && (
              <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Clock size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-amber-800">Pending Deposit Active</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">{timeLeft} left</span>
                    </div>
                    <p className="text-xs text-amber-950/80 font-medium mt-0.5">
                      Active session for <strong>{activeOrder.payAmount} {activeOrder.payCurrency} (${activeOrder.priceAmount} USD)</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    id="resume-pending-session-btn"
                    onClick={() => setStep('payment_terminal')}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                  >
                    Resume Payment
                  </button>
                  <button
                    type="button"
                    id="cancel-pending-session-btn"
                    onClick={handleCancelAndStartFresh}
                    disabled={isCancellingOrder}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer transition-all"
                  >
                    {isCancellingOrder ? 'Cancelling...' : 'Cancel & Start Fresh'}
                  </button>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-1">
                Deposit {currentSymbol}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Instant Low fees deposit
              </p>
            </div>

            {/* Choose Network Section (Moved up before amount input) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Choose Network
                </span>
                <div className="flex items-center gap-1.5" id="network-filter-pills">
                  <button
                    id="network-filter-all"
                    onClick={() => setNetworkFilter('all')}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                      networkFilter === 'all'
                        ? 'border border-slate-900 text-slate-900 bg-white shadow-xs'
                        : 'border border-slate-200 text-slate-500 hover:text-slate-800 bg-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    id="network-filter-lower-fees"
                    onClick={() => setNetworkFilter('lower_fees')}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                      networkFilter === 'lower_fees'
                        ? 'border border-slate-900 text-slate-900 bg-white shadow-xs'
                        : 'border border-slate-200 text-slate-500 hover:text-slate-800 bg-white'
                    }`}
                  >
                    Lower Fees
                  </button>
                </div>
              </div>

              {/* Network Cards */}
              <div className="space-y-2.5" id="network-cards-list">
                {displayedNetworks.map((net) => {
                  const isSelected = selectedNetwork?.networkKey === net.networkKey;
                  return (
                    <div
                      key={net.networkKey}
                      id={`network-card-${net.networkKey.toLowerCase()}`}
                      onClick={() => setSelectedNetwork(net)}
                      className={`rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all border shadow-xs ${
                        isSelected
                          ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <CoinBadge3D symbol={currentSymbol} size={42} />
                        <div className="absolute -bottom-1 -right-1">
                          <NetworkBadgeOverlay networkName={net.name} />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-base ${isSelected ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {net.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {net.networkKey}
                          </span>
                          {net.isLowerFee && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500 text-white">
                              Low Fee
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          Min deposit: {net.minDepositFormatted}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Settlement speed: ~{net.speed}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Deposit Amount Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Amount to Deposit (USD)
                </label>
                <span className="text-xs font-bold text-emerald-600 font-mono">
                  1 {currentSymbol} = $1.00 USD
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400 font-mono">
                  $
                </span>
                <input
                  type="number"
                  id="deposit-usd-amount-input"
                  min="0"
                  step="any"
                  value={amountUSDInput}
                  onChange={(e) => setAmountUSDInput(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-9 pr-16 text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-500 font-mono">
                  {currentSymbol}
                </span>
              </div>
            </div>

            {/* Referral / Welcome Bonus Banner (if configured) */}
            {referralConfig && referralConfig.enabled && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 text-emerald-950 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                      Welcome Bonus Active
                    </h4>
                    <p className="text-[11px] text-emerald-900/80 font-medium">
                      First-time depositors receive automated bonus credits upon settlement.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500 text-white shrink-0">
                  Bonus Eligible
                </span>
              </div>
            )}

            {/* Error banner */}
            {errorState && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-500 shrink-0" />
                <span className="font-bold flex-1">{errorState}</span>
              </div>
            )}

            {/* Proceed Button */}
            <div className="pt-2">
              <button
                type="button"
                id="proceed-to-gateway-btn"
                onClick={handleInitiateAutomatedPayment}
                disabled={isCreatingOrder || parseFloat(amountUSDInput) <= 0 || isNaN(parseFloat(amountUSDInput))}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                {isCreatingOrder ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Connecting to NOWPayments Gateway...</span>
                  </>
                ) : (
                  <>
                    <Zap size={18} className="fill-white" />
                    <span>
                      {parseFloat(amountUSDInput) > 0 
                        ? `Proceed to Automated Deposit ($${amountUSDInput} USD)` 
                        : 'Enter Deposit Amount'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: AUTOMATED NOWPAYMENTS PAYMENT TERMINAL                             */}
        {/* ========================================================================= */}
        {step === 'payment_terminal' && activeOrder && (
          <div className="animate-fadeIn space-y-4" id="deposit-payment-terminal-view">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <button 
                id="deposit-terminal-back-btn"
                onClick={() => setStep('choose_network')}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs"
                title="Change Network or Amount"
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>

              <div className="flex items-center gap-2">
                {!isFinished && !isExpired && (
                  <button
                    type="button"
                    id="cancel-terminal-order-btn"
                    onClick={handleCancelAndStartFresh}
                    disabled={isCancellingOrder}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                  >
                    {isCancellingOrder ? 'Cancelling...' : 'Cancel Deposit'}
                  </button>
                )}
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Secure NOWPayments Terminal</span>
                </span>
              </div>
            </div>

            {/* Live Gateway Status Header Banner */}
            <div className={`p-4 rounded-3xl border transition-all shadow-sm ${
              isExpired
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : isFinished
                ? 'bg-emerald-500 text-white border-emerald-400'
                : pollingStatus === 'confirming' || pollingStatus === 'confirmed' || pollingStatus === 'sending'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-white border-slate-200/90 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    isExpired
                      ? 'bg-rose-100 text-rose-600'
                      : isFinished
                      ? 'bg-white/20 text-white'
                      : pollingStatus === 'confirming' || pollingStatus === 'confirmed' || pollingStatus === 'sending'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isExpired ? (
                      <AlertCircle size={24} className="stroke-[2.5]" />
                    ) : isFinished ? (
                      <CheckCircle2 size={24} className="stroke-[2.5]" />
                    ) : pollingStatus === 'confirming' || pollingStatus === 'confirmed' || pollingStatus === 'sending' ? (
                      <RefreshCw size={22} className="animate-spin" />
                    ) : (
                      <Clock size={22} className="animate-pulse" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-sm tracking-tight uppercase">
                      {isExpired
                        ? 'Payment Duration Expired'
                        : isFinished
                        ? 'Payment Confirmed & Credited'
                        : pollingStatus === 'confirming' || pollingStatus === 'confirmed' || pollingStatus === 'sending'
                        ? 'Transaction Detected on Blockchain'
                        : 'Waiting for Your Transfer'}
                    </h3>
                    <p className={`text-xs mt-0.5 font-medium ${
                      isExpired ? 'text-rose-700' : isFinished || pollingStatus !== 'waiting' ? 'opacity-90' : 'text-slate-500'
                    }`}>
                      {isExpired
                        ? 'Payment time elapsed with no funds detected on blockchain. Transaction marked as failed.'
                        : isFinished
                        ? 'Your account wallet has been credited successfully!'
                        : pollingStatus === 'confirming' || pollingStatus === 'confirmed' || pollingStatus === 'sending'
                        ? 'Waiting for final block confirmations (~1-2 min)...'
                        : `Send exact amount to address below • Session active (${timeLeft})`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleManualStatusCheck}
                  disabled={isCheckingStatus || isFinished || isExpired}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isFinished || isExpired
                      ? 'hidden'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Check live on-chain status"
                >
                  <RefreshCw size={14} className={isCheckingStatus ? 'animate-spin text-emerald-600' : ''} />
                </button>
              </div>
            </div>

            {/* Expired / Failed State Card */}
            {isExpired ? (
              <div className="bg-white rounded-3xl p-6 border border-rose-200 text-center space-y-4 shadow-sm animate-scaleUp">
                <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-md">
                  <AlertCircle size={36} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Deposit Session Expired
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 font-medium">
                    The 20-minute payment duration ended with no crypto transfer detected. This transaction has been marked as failed.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 font-mono space-y-1">
                  <div>Payment ID: <strong className="text-slate-900">{activeOrder.paymentId}</strong></div>
                  <div>Status: <strong className="text-rose-600">FAILED / EXPIRED</strong></div>
                </div>

                <button
                  type="button"
                  onClick={handleCancelAndStartFresh}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-2xl shadow-md cursor-pointer transition-all"
                >
                  Start New Deposit
                </button>
              </div>
            ) : isFinished ? (
              /* Finished Celebration Card */
              <div className="bg-white rounded-3xl p-6 border border-emerald-200 text-center space-y-4 shadow-sm animate-scaleUp">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 size={36} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Deposit Successfully Completed!
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 font-medium">
                    +${(creditedAmount || activeOrder.priceAmount).toFixed(2)} USD credited to your Movable Wallet
                  </p>
                </div>

                {actuallyPaidCrypto !== null && activeOrder.payAmount > 0 && Math.abs(actuallyPaidCrypto - activeOrder.payAmount) > 0.0001 && (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-900 font-medium text-left">
                    {actuallyPaidCrypto < activeOrder.payAmount ? (
                      <span>
                        <strong>Adjusted for network fee:</strong> You sent <strong>{actuallyPaidCrypto} {currentSymbol}</strong>. Your account has been credited with the actual received amount: <strong>${(creditedAmount || activeOrder.priceAmount).toFixed(2)} USD</strong>.
                      </span>
                    ) : (
                      <span>
                        <strong>Overpayment credited:</strong> You sent <strong>{actuallyPaidCrypto} {currentSymbol}</strong>. Your account has been credited with the full extra received amount: <strong>${(creditedAmount || activeOrder.priceAmount).toFixed(2)} USD</strong>.
                      </span>
                    )}
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 font-mono space-y-1">
                  <div>Payment ID: <strong className="text-slate-900">{activeOrder.paymentId}</strong></div>
                  <div>Network: <strong className="text-slate-900">{activeOrder.network}</strong></div>
                  <div>Settled: <strong className="text-emerald-600">AUTOMATED VIA NOWPAYMENTS</strong></div>
                </div>

                <button
                  type="button"
                  onClick={onSuccess}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 rounded-2xl shadow-md cursor-pointer transition-all"
                >
                  Done & View Wallet Balance
                </button>
              </div>
            ) : (
              <>
                {/* QR Code and Address Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5 text-center">
                  {/* Top Amount Highlight */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Exact Amount to Send
                    </span>
                    <div className="text-right">
                      <span className="text-base font-black font-mono text-emerald-600 block">
                        {activeOrder.payAmount} {currentSymbol}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 block font-bold">
                        ≈ ${activeOrder.priceAmount.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-xs inline-block">
                      <img 
                        src={qrCodeUrl} 
                        alt="Deposit QR Code" 
                        className="w-48 h-48 rounded-lg"
                        loading="eager"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Scan with Binance, Trust Wallet, MetaMask, or any crypto app
                    </span>
                  </div>

                  {/* Deposit Address Box */}
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Deposit Address ({activeOrder.network})
                      </label>
                      <span className="text-[10px] font-bold text-emerald-600">
                        NOWPayments Dedicated Address
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
                      <span className="font-mono text-xs text-slate-800 break-all flex-1 font-bold select-all px-1">
                        {activeOrder.payAddress}
                      </span>
                      <button
                        id="copy-terminal-address-btn"
                        onClick={() => handleCopy(activeOrder.payAddress)}
                        className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-xs transition-all shrink-0 cursor-pointer text-xs"
                      >
                        {copied ? <Check size={14} className="stroke-[3]" /> : <Copy size={14} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-left text-xs text-amber-900 flex items-start gap-2.5">
                    <Shield size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium">
                      Send only <strong>{currentSymbol}</strong> via <strong>{activeOrder.network}</strong>. Once sent, our system detects the transaction within seconds and automatically credits your balance upon 1 network confirmation.
                    </p>
                  </div>
                </div>

                {/* Optional Fallback Accordion for Manual Proof (Edge Cases) */}
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowManualFallback(!showManualFallback)}
                    className="w-full px-4 py-3 text-xs font-bold text-slate-600 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span>Need to attach transaction receipt or TX Hash manually?</span>
                    {showManualFallback ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showManualFallback && (
                    <div className="p-4 pt-1 border-t border-slate-100 space-y-3 animate-fadeIn">
                      <p className="text-[11px] text-slate-500">
                        NOWPayments verifies payments automatically. However, if you transferred from an internal exchange off-chain, you may attach a screenshot here:
                      </p>

                      {!manualEvidence ? (
                        <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors bg-slate-50">
                          <UploadCloud size={20} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-700">Attach screenshot</span>
                          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                      ) : (
                        <div className="space-y-2">
                          <img src={manualEvidence} alt="Proof" className="max-h-32 rounded-lg mx-auto border" />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setManualEvidence('')}
                              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={handleFallbackSubmit}
                              disabled={isSubmittingManual}
                              className="ml-auto bg-slate-900 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-slate-800"
                            >
                              {isSubmittingManual ? 'Attaching...' : 'Attach Proof'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
