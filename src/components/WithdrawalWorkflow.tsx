import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, doc, runTransaction, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import { CryptoNetwork, UserAccount, CryptoPrice, WithdrawalConfig } from '../types';
import { DEFAULT_NETWORKS } from '../seedData';
import { 
  ArrowLeft, ChevronRight, Check, 
  AlertCircle, RefreshCw, Lock,
  Key, ArrowRight, X, ShieldCheck, Wallet, ExternalLink, Copy, CheckCircle2
} from 'lucide-react';
import { CoinIcon } from './StandardUserDashboard';
import { CoinBadge3D } from './DepositIcons';
import { WithdrawCoinModal } from './WithdrawCoinModal';

interface WithdrawalWorkflowProps {
  user: any;
  initialCoinSymbol?: string;
  onBack: () => void;
  onSuccess: () => void;
  onGoToProfile?: () => void;
}

export default function WithdrawalWorkflow({ 
  user, 
  initialCoinSymbol = 'USDT',
  onBack, 
  onSuccess, 
  onGoToProfile 
}: WithdrawalWorkflowProps) {
  const [profile, setProfile] = useState<UserAccount | null>(null);
  const [networks, setNetworks] = useState<CryptoNetwork[]>(DEFAULT_NETWORKS);
  const [selectedCoin, setSelectedCoin] = useState<CryptoNetwork | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('BEP20');
  const [destAddress, setDestAddress] = useState<string>('');
  const [amountUSD, setAmountUSD] = useState<string>('');
  const [lockedUSDT, setLockedUSDT] = useState<number>(0);
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, CryptoPrice>>({});

  // Dynamic Admin Withdrawal Fee Configuration (standard normal fee only)
  const [withdrawalConfig, setWithdrawalConfig] = useState<WithdrawalConfig>({
    standardFeePercent: 15,
    minWithdrawalUSD: 10
  });

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedBoundAddr, setCopiedBoundAddr] = useState<boolean>(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState<boolean>(false);

  // Dedicated PIN Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [walletPIN, setWalletPIN] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Inline address binding drawer/form
  const [showInlineBind, setShowInlineBind] = useState<boolean>(false);
  const [bindAddressInput, setBindAddressInput] = useState<string>('');
  const [bindPinInput, setBindPinInput] = useState<string>('');
  const [bind2faInput, setBind2faInput] = useState<string>('');
  const [bindSaving, setBindSaving] = useState<boolean>(false);

  const handleGoToPinSettings = () => {
    localStorage.setItem('profile_subpage', 'pin');
    if (onGoToProfile) onGoToProfile();
    else onBack();
  };

  const handleGoToAddressBinding = () => {
    localStorage.setItem('profile_subpage', 'withdrawal_address');
    if (onGoToProfile) onGoToProfile();
    else onBack();
  };

  const formatCoinName = (tokenName: string) => {
    if (!tokenName) return '';
    const match = tokenName.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (match) {
      const fullName = match[1].trim();
      const symbol = match[2].trim();
      return `${symbol} (${fullName})`;
    }
    return tokenName;
  };

  // 1. Subscribe to Live User Profile
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const uData = { ...docSnap.data(), uid: docSnap.id } as UserAccount;
        setProfile(uData);
        if (uData.bep20WithdrawalAddress) {
          setDestAddress(uData.bep20WithdrawalAddress);
        }
      }
      setLoading(false);
    }, (err) => {
      console.warn('User profile listener in WithdrawalWorkflow:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  // 2. Subscribe to Crypto Networks
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'crypto_networks'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as CryptoNetwork));
        setNetworks(list);
      }
    }, (err) => {
      console.warn('Crypto networks listener in WithdrawalWorkflow:', err);
    });
    return () => unsub();
  }, []);

  // 3. Subscribe to Crypto Prices
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'crypto_prices'), (snap) => {
      if (!snap.empty) {
        const map: Record<string, CryptoPrice> = {};
        snap.docs.forEach(d => {
          map[d.id.toUpperCase()] = d.data() as CryptoPrice;
        });
        setCryptoPrices(map);
      }
    }, (err) => {
      console.warn('Crypto prices listener in WithdrawalWorkflow:', err);
    });
    return () => unsub();
  }, []);

  // 4. Subscribe to Admin Withdrawal Config (Normal Standard Fee Only from settings/withdrawal_config)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'withdrawal_config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const stdFee = typeof data.standardFeePercent === 'number' 
          ? data.standardFeePercent 
          : (data.standardFeePercent !== undefined && !isNaN(parseFloat(data.standardFeePercent)) 
              ? parseFloat(data.standardFeePercent) 
              : 15);
        const minWith = typeof data.minWithdrawalUSD === 'number' 
          ? data.minWithdrawalUSD 
          : (data.minWithdrawalUSD !== undefined && !isNaN(parseFloat(data.minWithdrawalUSD))
              ? parseFloat(data.minWithdrawalUSD)
              : 10);
        setWithdrawalConfig({
          standardFeePercent: stdFee,
          minWithdrawalUSD: minWith,
          customNotice: data.customNotice || ''
        });
      }
    }, (err) => {
      console.warn('Settings/withdrawal_config listener in WithdrawalWorkflow:', err);
    });
    return () => unsub();
  }, []);

  // 5. Subscribe to Locked MMF USDT (Scoped strictly to current user)
  useEffect(() => {
    if (!user?.uid) return;
    const invQuery = query(collection(db, 'investments'), where('userId', '==', user.uid));
    const unsub = onSnapshot(invQuery, (snap) => {
      let locked = 0;
      snap.docs.forEach(docSnap => {
        const inv = docSnap.data();
        const isUsdt = (inv.coinSymbol || '').toUpperCase() === 'USDT';
        const isActive = (inv.status || '').toUpperCase() === 'ACTIVE';
        if (isUsdt && isActive) {
          locked += (inv.amountUSD || inv.amount || 0);
        }
      });
      setLockedUSDT(locked);
    }, (err) => {
      console.warn('Investments listener error in WithdrawalWorkflow:', err);
    });
    return () => unsub();
  }, [user?.uid]);

  // 6. Set selected coin based on initialCoinSymbol or fallback to USDT
  useEffect(() => {
    const targetSymbol = (initialCoinSymbol || sessionStorage.getItem('preselected_withdraw_coin') || 'USDT').toUpperCase();
    const found = networks.find(n => n.id.toUpperCase() === targetSymbol) || networks.find(n => n.id.toUpperCase() === 'USDT') || networks[0];
    if (found) {
      setSelectedCoin(found);
      const isUSDT = found.id.toUpperCase() === 'USDT';
      if (isUSDT) {
        const bepNet = found.networks.find(n => n.toUpperCase().includes('BEP20') || n.toUpperCase().includes('BSC') || n.toUpperCase().includes('BNB')) || 'BEP20';
        setSelectedNetwork(bepNet);
      } else {
        setSelectedNetwork(found.networks && found.networks.length > 0 ? found.networks[0] : 'Standard');
      }
    }
  }, [networks, initialCoinSymbol]);

  // Helper values
  const coinSym = selectedCoin ? selectedCoin.id.toUpperCase() : 'USDT';
  const isUSDT = coinSym === 'USDT';
  
  const getUnlockedHolding = (symbol: string): number => {
    if (!profile) return 0;
    if (symbol === 'USDT') {
      return Math.max(0, (profile.balance || 0) - lockedUSDT);
    }
    const h = profile.holdings || {};
    return h[symbol] || 0;
  };

  const getCoinPrice = (symbol: string): number => {
    if (symbol === 'USDT' || symbol === 'USDC') return 1.0;
    return cryptoPrices[symbol]?.current_price || 0;
  };

  const unlockedBalance = getUnlockedHolding(coinSym);
  const coinPrice = getCoinPrice(coinSym);
  const availableUSD = isUSDT ? unlockedBalance : unlockedBalance * coinPrice;
  const currentNumVal = parseFloat(amountUSD || '0');
  const coinEquivalent = coinPrice > 0 ? (currentNumVal / coinPrice) : currentNumVal;
  const boundAddress = profile?.bep20WithdrawalAddress || destAddress;

  // Fee calculation (Standard normal fee only!)
  const standardFeePct = withdrawalConfig.standardFeePercent ?? 15;
  const grossVal = parseFloat(amountUSD || '0') || 0;
  const feeVal = parseFloat((grossVal * (standardFeePct / 100)).toFixed(2));
  const netVal = Math.max(0, parseFloat((grossVal - feeVal).toFixed(2)));
  const netCoinVal = coinPrice > 0 ? (netVal / coinPrice) : netVal;

  const validateCryptoAddress = (addr: string, net: string) => {
    if (!addr || !addr.trim()) return false;
    const clean = addr.trim();
    const upNet = net.toUpperCase();
    if (upNet.includes('BEP20') || upNet.includes('BSC') || upNet.includes('BNB') || upNet.includes('ERC20') || upNet.includes('ETH') || upNet.includes('POLYGON')) {
      return /^0x[a-fA-F0-9]{40}$/.test(clean);
    }
    if (upNet.includes('TRC20') || upNet.includes('TRON')) {
      return /^T[a-km-zA-HJ-NP-Z1-9]{33}$/.test(clean);
    }
    if (upNet.includes('SOL')) {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean);
    }
    if (upNet.includes('BTC')) {
      return /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(clean);
    }
    return clean.length >= 26;
  };

  // Inline address binding submission
  const handleSaveInflowBinding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanAddr = bindAddressInput.trim();

    if (!cleanAddr || !/^0x[a-fA-F0-9]{40}$/.test(cleanAddr)) {
      setError('Invalid BEP20 address. Must be a valid 42-character BNB Smart Chain address starting with 0x.');
      return;
    }
    if (!profile?.walletPassword) {
      setError('Please configure a 4-digit Wallet Security PIN in your Profile settings first.');
      return;
    }
    if (bindPinInput !== profile.walletPassword) {
      setError('Incorrect Wallet Security PIN.');
      return;
    }

    setBindSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await runTransaction(db, async (t) => {
        t.update(userRef, {
          bep20WithdrawalAddress: cleanAddr,
          bep20AddressBoundAt: serverTimestamp()
        });
      });
      setDestAddress(cleanAddr);
      setShowInlineBind(false);
      setBindAddressInput('');
      setBindPinInput('');
      setBind2faInput('');
    } catch (err: any) {
      console.error('Error binding BEP20 address:', err);
      setError(err.message || 'Failed to bind BEP20 address.');
    } finally {
      setBindSaving(false);
    }
  };

  // Pre-flight validation before opening PIN modal
  const handleOpenPinModal = () => {
    setError(null);
    setPinError(null);

    if (profile && !profile.withdrawalEnabled) {
      setError('Withdrawal permissions are currently suspended for your account. Please contact support.');
      return;
    }

    if (isUSDT && !profile?.bep20WithdrawalAddress) {
      setShowInlineBind(true);
      setError('Please bind your verified BEP20 (BNB Smart Chain) address before requesting a withdrawal.');
      return;
    }

    const activeDest = isUSDT ? (profile?.bep20WithdrawalAddress || destAddress) : destAddress;
    if (!activeDest || !activeDest.trim()) {
      setError(`Please enter your destination ${coinSym} wallet address.`);
      return;
    }

    if (!validateCryptoAddress(activeDest, selectedNetwork)) {
      if (isUSDT) {
        setError('Invalid bound BEP20 destination address. Must be a valid 42-character BNB Smart Chain address starting with 0x.');
      } else {
        setError(`Invalid destination address format for ${selectedNetwork}. Please verify the address.`);
      }
      return;
    }

    const minLimitUSD = selectedCoin?.minWithdrawalUSD ?? withdrawalConfig.minWithdrawalUSD ?? 10;
    if (!amountUSD || isNaN(grossVal) || grossVal <= 0) {
      setError('Please enter a valid withdrawal amount.');
      return;
    }

    if (grossVal < minLimitUSD) {
      setError(`Minimum withdrawal amount for ${formatCoinName(selectedCoin?.tokenName || '')} is $${minLimitUSD.toFixed(2)} USD.`);
      return;
    }

    if (grossVal > availableUSD + 0.0001) {
      if (isUSDT) {
        setError(`Insufficient available balance. You have $${availableUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} available.`);
      } else {
        setError(`Insufficient ${coinSym} balance. You have ${unlockedBalance.toFixed(6)} ${coinSym} (≈ $${availableUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD) available.`);
      }
      return;
    }

    if (!profile?.walletPassword) {
      setError('Please configure a 4-digit Wallet Security PIN in your Profile settings before withdrawing.');
      return;
    }

    // Open PIN confirmation modal
    setWalletPIN('');
    setIsPinModalOpen(true);
  };

  // Submit withdrawal after PIN validation in modal
  const handleConfirmPinSubmit = async () => {
    setPinError(null);

    if (!walletPIN || walletPIN.length !== 4) {
      setPinError('Please enter your 4-digit Security PIN.');
      return;
    }

    if (walletPIN !== profile?.walletPassword) {
      setPinError('Incorrect Wallet Security PIN. Please verify your PIN.');
      return;
    }

    setSubmitting(true);

    try {
      const activeDest = isUSDT ? (profile?.bep20WithdrawalAddress || destAddress) : destAddress;
      const coinAmt = coinPrice > 0 ? parseFloat((grossVal / coinPrice).toFixed(8)) : grossVal;

      // Execute atomic Firestore transaction
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error('User record does not exist.');
        }

        const userData = userSnap.data();

        if (isUSDT) {
          const currentBal = userData.balance || 0;
          const currentAvailable = Math.max(0, currentBal - lockedUSDT);
          if (grossVal > currentAvailable + 0.0001) {
            throw new Error(`Insufficient available balance. You have $${currentAvailable.toFixed(2)} available.`);
          }
          transaction.update(userRef, {
            balance: parseFloat((currentBal - grossVal).toFixed(2))
          });
        } else {
          const currentHoldings = userData.holdings || {};
          const currentCoinBal = currentHoldings[coinSym] || 0;
          if (coinAmt > currentCoinBal + 0.000001) {
            throw new Error(`Insufficient ${coinSym} balance. You have ${currentCoinBal.toFixed(6)} ${coinSym}.`);
          }
          transaction.update(userRef, {
            holdings: {
              ...currentHoldings,
              [coinSym]: Math.max(0, currentCoinBal - coinAmt)
            }
          });
        }

        const txRef = doc(collection(db, 'transactions'));
        transaction.set(txRef, {
          id: txRef.id,
          userId: user.uid,
          userEmail: user.email,
          type: 'withdraw_crypto',
          amount: grossVal,
          feePercent: standardFeePct,
          feeAmount: feeVal,
          netAmount: netVal,
          coinSymbol: coinSym,
          coinAmount: coinAmt,
          earlyContractWithdrawal: false,
          status: 'PENDING APPROVAL',
          createdAt: serverTimestamp(),
          network: selectedNetwork,
          address: activeDest,
          merchantName: selectedCoin ? formatCoinName(selectedCoin.tokenName) : ''
        });
      });

      setIsPinModalOpen(false);
      onSuccess();
    } catch (err: any) {
      console.error('Withdrawal submission error:', err);
      setPinError(err.message || 'Failed to submit withdrawal request.');
    } finally {
      setSubmitting(false);
    }
  };

  const shortenAddress = (addr: string) => {
    if (!addr || addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div id="withdraw-workflow-container" className="max-w-md mx-auto p-4 sm:p-5 bg-[#f8fafc] text-slate-800 rounded-3xl shadow-md min-h-[calc(100vh-140px)]">
      {/* Coin Selector Modal */}
      <WithdrawCoinModal
        isOpen={isCoinModalOpen}
        onClose={() => setIsCoinModalOpen(false)}
        onSelectCoin={(symbol) => {
          setIsCoinModalOpen(false);
          const found = networks.find(n => n.id.toUpperCase() === symbol.toUpperCase());
          if (found) {
            setSelectedCoin(found);
            const isU = found.id.toUpperCase() === 'USDT';
            if (isU) {
              const bepNet = found.networks.find(n => n.toUpperCase().includes('BEP20') || n.toUpperCase().includes('BSC') || n.toUpperCase().includes('BNB')) || 'BEP20';
              setSelectedNetwork(bepNet);
            } else {
              setSelectedNetwork(found.networks && found.networks.length > 0 ? found.networks[0] : 'Standard');
            }
          }
        }}
        networks={networks}
      />

      {/* Modern Header */}
      <div className="flex items-center gap-3 mb-5">
        <button 
          id="withdraw-back-btn"
          onClick={onBack}
          className="p-2.5 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer"
          title="Back to Dashboard"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-black tracking-tight text-zinc-900">
            Withdraw {coinSym}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Send assets to your verified blockchain address
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCoinModalOpen(true)}
          className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
        >
          <span>Change Asset</span>
          <ChevronRight size={14} className="text-zinc-400" />
        </button>
      </div>

      {/* Account Restrictions Banner */}
      {profile && !profile.withdrawalEnabled && (
        <div id="withdrawal-disabled-alert" className="p-3.5 mb-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-start gap-2.5 shadow-xs">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
          <span>
            <strong>Withdrawal Restricted:</strong> Withdrawal permissions are currently suspended for your account. Please contact customer support.
          </span>
        </div>
      )}

      {/* Alert banner if user has NOT configured a Wallet Security PIN */}
      {profile && !profile.walletPassword && (
        <div id="missing-pin-top-banner" className="p-4 mb-4 bg-emerald-50/70 border border-emerald-200/80 text-zinc-800 rounded-2xl text-xs space-y-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-700 shrink-0">
              <Key size={18} />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-zinc-900">Security PIN Not Set</h4>
              <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                You must set up a 4-digit Wallet Security PIN before you can perform any withdrawals.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="setup-pin-top-btn"
            onClick={handleGoToPinSettings}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Key size={14} />
            <span>Set Up Security PIN in Profile</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div id="withdrawal-error-banner" className="p-3.5 mb-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs space-y-2 shadow-xs relative">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5 pr-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
              <span className="font-semibold text-xs leading-snug">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="p-1 hover:bg-red-100 rounded-lg text-red-600 transition-colors cursor-pointer shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] gap-3">
          <RefreshCw size={24} className="text-emerald-600 animate-spin" />
          <span className="text-xs text-zinc-500 font-medium">Loading withdrawal account...</span>
        </div>
      ) : (
        <div className="space-y-4 text-left">
          {/* Selected Asset Banner */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 flex items-center justify-between gap-3.5 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="shrink-0">
                <CoinBadge3D symbol={coinSym} size={42} />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Selected Asset</span>
                <span className="text-base font-black text-zinc-900">{formatCoinName(selectedCoin?.tokenName || coinSym)}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Available Balance</span>
              <span className="text-sm font-black text-emerald-600 font-mono">
                {unlockedBalance < 1 && coinSym !== 'USDT' && coinSym !== 'USDC' 
                  ? unlockedBalance.toFixed(6) 
                  : unlockedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {coinSym}
              </span>
              {coinSym !== 'USDT' && coinSym !== 'USDC' && (
                <span className="text-[10px] text-zinc-500 block font-mono">≈ ${availableUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</span>
              )}
            </div>
          </div>

          {/* Network Selector / Locked BEP20 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Withdrawal Network
              </label>
              {isUSDT ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  Locked to BEP20
                </span>
              ) : (
                <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">
                  {selectedCoin?.networks?.length || 1} Network
                </span>
              )}
            </div>

            {isUSDT ? (
              <div className="p-3.5 bg-white border border-zinc-200/90 rounded-2xl flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-black text-xs text-emerald-700 font-mono">
                    BSC
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-zinc-900">BEP20</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">BNB Chain</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">BNB Smart Chain (BEP-20 Standard)</p>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Check size={12} strokeWidth={3} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(selectedCoin?.networks || [selectedNetwork]).map((netName) => {
                  const isSelected = selectedNetwork === netName;
                  return (
                    <button
                      key={netName}
                      type="button"
                      onClick={() => setSelectedNetwork(netName)}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 font-bold shadow-2xs'
                          : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700'
                      }`}
                    >
                      <span className="font-mono text-xs">{netName}</span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Linked BEP20 Destination Address Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                {isUSDT ? 'Linked BEP20 Destination Address' : 'Destination Wallet Address'}
              </label>
              {isUSDT && boundAddress && (
                <button
                  type="button"
                  id="change-bound-address-link"
                  onClick={() => setShowInlineBind(!showInlineBind)}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{showInlineBind ? 'Keep Current' : 'Change Address'}</span>
                  <ExternalLink size={11} />
                </button>
              )}
            </div>

            {/* Inline Address Binding Form */}
            {(!boundAddress || showInlineBind) && isUSDT ? (
              <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 space-y-3.5 shadow-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-zinc-900">
                      {boundAddress ? 'Update Linked BEP20 Address' : 'Bind Verified BEP20 Payout Address'}
                    </h4>
                    <p className="text-[10px] text-zinc-500">Must be a valid 42-character BSC address</p>
                  </div>
                </div>

                <form onSubmit={handleSaveInflowBinding} className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-semibold text-zinc-600">BEP20 (BNB Smart Chain) Address</span>
                      {bindAddressInput.trim() && /^0x[a-fA-F0-9]{40}$/.test(bindAddressInput.trim()) && (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Valid BSC Format
                        </span>
                      )}
                    </div>
                    <input
                      id="inflow-bind-bep20-address"
                      type="text"
                      required
                      placeholder="0x... (42-character BNB Chain address)"
                      value={bindAddressInput}
                      onChange={(e) => setBindAddressInput(e.target.value)}
                      className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold text-zinc-600 text-[10px] block">Enter 4-Digit Security PIN</span>
                    <input
                      id="inflow-bind-pin"
                      type="password"
                      maxLength={4}
                      required
                      placeholder="••••"
                      value={bindPinInput}
                      onChange={(e) => setBindPinInput(e.target.value.replace(/\D/g, ''))}
                      className="w-32 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-center text-sm font-mono tracking-widest text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    id="save-inflow-bind-bep20-btn"
                    type="submit"
                    disabled={bindSaving || !bindAddressInput || !bindPinInput || bindPinInput.length !== 4}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    {bindSaving ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Binding Address...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        <span>Save & Lock BEP20 Address</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : isUSDT && boundAddress ? (
              <div className="bg-white border border-zinc-200/90 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70 flex items-center gap-1">
                    <ShieldCheck size={11} className="text-emerald-600" />
                    BEP20 Verified Payout Wallet
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(boundAddress);
                      setCopiedBoundAddr(true);
                      setTimeout(() => setCopiedBoundAddr(false), 2000);
                    }}
                    className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedBoundAddr ? (
                      <>
                        <Check size={11} className="text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-zinc-900 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/80 break-all select-all font-semibold">
                  {boundAddress}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  id="withdraw-crypto-dest-address"
                  type="text"
                  required
                  placeholder={`Enter your ${selectedNetwork} address`}
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  className="w-full px-3.5 py-3 bg-white border border-zinc-200/90 rounded-xl text-xs font-mono text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-zinc-400 shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* Amount (USD) Input Section */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zinc-600">Amount (USD to Withdraw)</label>
              <span className="text-[10px] text-zinc-500 font-semibold font-mono">
                Available: ${availableUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-bold text-sm">$</span>
              <input
                id="withdraw-crypto-amount"
                type="number"
                required
                placeholder="0.00"
                value={amountUSD}
                onChange={(e) => setAmountUSD(e.target.value)}
                className="w-full pl-8 pr-16 py-3 bg-white border border-zinc-200/90 rounded-xl text-base focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-zinc-900 font-mono shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setAmountUSD(availableUSD.toFixed(2))}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center"
              >
                <span className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-[10px] px-2.5 py-1 rounded-lg border border-emerald-200/80 transition-all cursor-pointer">
                  MAX
                </span>
              </button>
            </div>

            {/* Helper limits & coin valuation */}
            <div className="flex justify-between items-center text-[11px] font-semibold text-zinc-500 pt-0.5 px-1">
              <span>Min. Withdrawal:</span>
              <span className="text-zinc-800 font-bold font-mono">
                ${(selectedCoin?.minWithdrawalUSD ?? withdrawalConfig.minWithdrawalUSD ?? 10).toFixed(2)} USD
              </span>
            </div>

            {currentNumVal > 0 && coinPrice > 0 && coinSym !== 'USDT' && (
              <p className="text-[11px] font-semibold text-emerald-900 bg-emerald-50/70 border border-emerald-200/60 p-2.5 rounded-xl">
                Asset Equivalent: <span className="font-bold text-emerald-700 font-mono">{coinEquivalent.toFixed(6)} {coinSym}</span>
              </p>
            )}
          </div>

          {/* Fee & Net Payout Summary (Normal standard fees only!) */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 space-y-2.5 shadow-xs text-xs">
            <div className="flex justify-between items-center text-zinc-500 pb-1.5 border-b border-zinc-100">
              <span>Requested Gross Amount</span>
              <span className="font-mono font-bold text-zinc-900">
                ${grossVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </div>
            <div className="flex justify-between items-center text-zinc-500 pb-1.5 border-b border-zinc-100">
              <span>Standard Withdrawal Fee ({standardFeePct}%)</span>
              <span className="font-mono font-bold text-rose-600">
                -${feeVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/80">
              <span className="text-emerald-950 font-bold">Estimated Net Payout</span>
              <div className="text-right">
                <span className="font-mono font-black text-emerald-700 text-sm block">
                  ${netVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
                {coinSym !== 'USDT' && (
                  <span className="font-mono font-semibold text-emerald-600 text-[10px] block">
                    ≈ {netCoinVal.toFixed(6)} {coinSym}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Proceed to PIN modal button */}
          <button
            id="withdraw-crypto-proceed"
            type="button"
            onClick={handleOpenPinModal}
            disabled={submitting || !amountUSD || grossVal <= 0}
            className="w-full flex items-center justify-between py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-sm font-bold transition-all shadow-xs mt-6 cursor-pointer"
          >
            <span>Proceed to PIN Authorization</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Security PIN Modal (Appears as a dedicated modern popup modal) */}
      {isPinModalOpen && (
        <div 
          id="withdrawal-pin-modal-overlay" 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div 
            id="withdrawal-pin-modal-card" 
            className="bg-white border border-zinc-200/90 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center relative overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Top Close Button */}
            <button
              id="close-pin-modal-btn"
              type="button"
              onClick={() => {
                setIsPinModalOpen(false);
                setPinError(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Lock / Key Icon */}
            <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <Lock size={24} />
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 tracking-tight">Security PIN Verification</h3>
              <p className="text-xs text-zinc-500 mt-1">Authorize withdrawal request</p>
            </div>

            {/* Payout Summary Strip */}
            <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-2xl text-xs space-y-1 text-left font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">Net Payout:</span>
                <span className="font-bold text-emerald-700">${netVal.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">Destination:</span>
                <span className="font-bold text-zinc-700">{shortenAddress(isUSDT ? (profile?.bep20WithdrawalAddress || destAddress) : destAddress)}</span>
              </div>
            </div>

            {/* Error in modal */}
            {pinError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2 text-left">
                <AlertCircle size={14} className="shrink-0 text-red-600" />
                <span>{pinError}</span>
              </div>
            )}

            {/* 4-digit PIN Input */}
            <div className="space-y-2 pt-1">
              <input
                id="withdraw-final-crypto-pin"
                type="password"
                maxLength={4}
                autoFocus
                required
                placeholder="••••"
                value={walletPIN}
                onChange={(e) => {
                  setPinError(null);
                  setWalletPIN(e.target.value.replace(/\D/g, ''));
                }}
                className="w-40 mx-auto px-4 py-3 bg-zinc-50 border border-zinc-200/90 rounded-2xl text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 block"
              />
              <button
                type="button"
                onClick={handleGoToPinSettings}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold block mx-auto cursor-pointer"
              >
                Wrong or forgot PIN? Reset in Profile Settings
              </button>
            </div>

            {/* Modal Buttons */}
            <div className="space-y-2 pt-2">
              <button
                id="confirm-crypto-release-btn"
                type="button"
                onClick={handleConfirmPinSubmit}
                disabled={submitting || !walletPIN || walletPIN.length !== 4}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer uppercase tracking-wider"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <span>CONFIRM & SUBMIT WITHDRAWAL</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPinModalOpen(false);
                  setPinError(null);
                }}
                className="w-full py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
