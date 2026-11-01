import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Transaction } from '../types';
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ArrowLeftRight, 
  ArrowDownLeft,
  ArrowUpRight,
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  RefreshCw, 
  Gift, 
  TrendingUp, 
  SendHorizontal, 
  Bot, 
  Sparkles, 
  Copy, 
  Check, 
  Building2, 
  Coins, 
  Cpu, 
  Users, 
  ShieldCheck, 
  PlusCircle, 
  MinusCircle, 
  Receipt,
  X,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Error in ActivityLog: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ActivityLogProps {
  userId: string;
  isLightTheme?: boolean;
}

type CategoryFilter = 'all' | 'deposits' | 'withdrawals' | 'transfers' | 'bot' | 'signals' | 'swap_buy' | 'rewards';

/**
 * Official Tether (USDT) Vector Emblem
 */
export function UsdtLogo({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id="usdt-grad-main" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#26A17B" />
          <stop offset="100%" stopColor="#145E45" />
        </linearGradient>
        <radialGradient id="usdt-specular" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#145E45" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#usdt-grad-main)" />
      <circle cx="50" cy="50" r="48" fill="url(#usdt-specular)" />
      <circle cx="50" cy="50" r="44.5" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.25" />
      {/* Official Tether Monogram */}
      <path 
        d="M31 29 H69 V37 H55 V42 C66.5 42.7 75 45.4 75 48.7 C75 52 66.5 54.7 55 55.4 V72 H45 V55.4 C33.5 54.7 25 52 25 48.7 C25 45.4 33.5 42.7 45 42 V37 H31 V29 Z" 
        fill="#FFFFFF" 
        fillRule="evenodd" 
      />
      <ellipse cx="50" cy="48.7" rx="17" ry="4" fill="url(#usdt-grad-main)" />
    </svg>
  );
}

/**
 * Realistic Transaction Icon representing authentic institutional and crypto asset operations
 */
function RealisticTransactionIcon({ 
  category, 
  isCredit 
}: { 
  category: string; 
  isCredit: boolean | null; 
}) {
  if (category === 'deposits') {
    return (
      <div className="relative w-10 h-10 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center">
        <UsdtLogo size={38} className="drop-shadow-xs" />
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-xs">
          <ArrowDownToLine className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      </div>
    );
  }

  if (category === 'withdrawals') {
    return (
      <div className="relative w-10 h-10 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center">
        <UsdtLogo size={38} className="drop-shadow-xs" />
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-xs">
          <ArrowUpFromLine className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      </div>
    );
  }

  if (category === 'transfers') {
    return (
      <div className="relative w-10 h-10 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center">
        <UsdtLogo size={38} className="drop-shadow-xs" />
        <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-xs ${
          isCredit ? 'bg-emerald-500' : 'bg-sky-500'
        }`}>
          {isCredit ? (
            <ArrowDownLeft className="w-2.5 h-2.5 stroke-[3]" />
          ) : (
            <ArrowUpRight className="w-2.5 h-2.5 stroke-[3]" />
          )}
        </span>
      </div>
    );
  }

  if (category === 'bot') {
    return (
      <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 dark:from-slate-850 dark:to-slate-800 border border-emerald-500/30 p-2 shrink-0 flex items-center justify-center shadow-xs">
        <Bot className="w-5 h-5 text-emerald-400 stroke-[2.2]" />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white dark:border-slate-900 animate-pulse" />
      </div>
    );
  }

  if (category === 'signals') {
    return (
      <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-950 to-slate-900 border border-emerald-500/30 p-2 shrink-0 flex items-center justify-center shadow-xs">
        <TrendingUp className="w-5 h-5 text-emerald-400 stroke-[2.4]" />
      </div>
    );
  }

  if (category === 'rewards') {
    return (
      <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 border border-amber-300 p-2 shrink-0 flex items-center justify-center shadow-xs text-amber-950">
        <Gift className="w-5 h-5 stroke-[2.4]" />
      </div>
    );
  }

  if (category === 'swap_buy') {
    return (
      <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-900 to-purple-900 border border-purple-500/30 p-2 shrink-0 flex items-center justify-center shadow-xs text-purple-300">
        <ArrowLeftRight className="w-5 h-5 stroke-[2.2]" />
      </div>
    );
  }

  // Fallback
  return (
    <div className="relative w-10 h-10 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center">
      <UsdtLogo size={38} className="drop-shadow-xs" />
    </div>
  );
}

export default function ActivityLog({ userId, isLightTheme = false }: ActivityLogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Type Filter dropdown
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filterOptions: { key: CategoryFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All Types', icon: <Receipt className="w-3.5 h-3.5 text-slate-400" /> },
    { key: 'deposits', label: 'Deposits', icon: <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500" /> },
    { key: 'withdrawals', label: 'Withdrawals', icon: <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-500" /> },
    { key: 'transfers', label: 'Transfers', icon: <ArrowLeftRight className="w-3.5 h-3.5 text-sky-500" /> },
    { key: 'bot', label: 'Bot Trades', icon: <Bot className="w-3.5 h-3.5 text-sky-500" /> },
    { key: 'signals', label: 'Signals & Copy', icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> },
    { key: 'swap_buy', label: 'Swaps & Buys', icon: <ArrowLeftRight className="w-3.5 h-3.5 text-purple-500" /> },
    { key: 'rewards', label: 'Vouchers & Rewards', icon: <Gift className="w-3.5 h-3.5 text-amber-500" /> },
  ];
  
  // Expanded receipt Modal
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    setLoading(true);
    const txCol = collection(db, 'transactions');
    const q = query(txCol, where('userId', '==', userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const list = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as Transaction));

        // Sort descending by creation date
        list.sort((a, b) => {
          const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() / 1000 || 0;
          const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() / 1000 || 0;
          return bTime - aTime;
        });

        // Auto-sync: If any NOWPayments deposit has expired but is still recorded as 'PENDING APPROVAL',
        // invoke /api/nowpayments/mark-failed in background to mark it FAILED in Firestore.
        list.forEach((tx: any) => {
          if (tx.gateway === 'nowpayments' && tx.status === 'PENDING APPROVAL' && tx.nowpaymentsPaymentId) {
            const txCreatedMs = tx.createdAt?.seconds ? tx.createdAt.seconds * 1000 : (tx.createdAt || 0);
            const expiryMs = tx.expiresAtMs || (txCreatedMs ? txCreatedMs + 20 * 60 * 1000 : 0);
            if (expiryMs > 0 && expiryMs < Date.now()) {
              fetch('/api/nowpayments/mark-failed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paymentId: tx.nowpaymentsPaymentId,
                  reason: 'Payment duration expired with no funds detected.'
                })
              }).catch(() => {});
            }
          }
        });

        setTransactions(list);
        setLoading(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'transactions');
      }
    }, (err) => {
      setError(err.message);
      setLoading(false);
      handleFirestoreError(err, OperationType.GET, 'transactions');
    });

    return () => unsubscribe();
  }, [userId]);

  const copyToClipboard = (text: string, type: 'id' | 'address') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  // Icon & Meta resolution for each transaction type
  const getTxTypeMeta = (tx: Transaction) => {
    const type: string = (tx.type as string) || '';
    const title = tx.title?.toLowerCase() || '';
    const notes = tx.paymentMessage?.toLowerCase() || '';

    // Auto Bot Trades
    if (
      type === 'Auto Bot trade' || 
      type === 'bot_harvest' || 
      type === 'bot_trade' || 
      type === 'bot' || 
      type.toLowerCase().includes('bot') || 
      title.includes('bot')
    ) {
      const isCredit = tx.isCredit !== undefined 
        ? tx.isCredit 
        : ((tx as any)?.isWin !== undefined 
            ? (tx as any).isWin 
            : (tx.status as any) === 'WIN' ||
              notes.includes('profit') || 
              notes.includes('harvest') || 
              notes.includes('stopped') || 
              notes.includes('returned'));

      return {
        label: tx.title || (isCredit ? 'Bot Profit Harvest' : 'Auto Bot Execution'),
        category: 'bot',
        isCredit: !!isCredit,
        colorClass: isCredit 
          ? (isLightTheme ? 'text-emerald-600' : 'text-emerald-400')
          : (isLightTheme ? 'text-sky-600' : 'text-sky-400'),
        badgeText: 'Auto Bot'
      };
    }

    // Vouchers & Bonuses
    if (
      type === 'voucher_reward' || 
      type === 'voucher' || 
      type === 'promo_voucher' || 
      type.toLowerCase().includes('voucher') || 
      title.includes('voucher') ||
      type === 'welcome_bonus' ||
      type === 'referral_reward' ||
      type === 'first_deposit_commission'
    ) {
      return {
        label: tx.title || (type === 'welcome_bonus' ? 'Welcome Bonus Reward' : type === 'referral_reward' ? 'Referral Reward' : 'Promo Voucher Credit'),
        category: 'rewards',
        isCredit: true,
        colorClass: isLightTheme ? 'text-amber-600' : 'text-amber-400',
        badgeText: 'Reward'
      };
    }

    // Upgrades
    if (
      type === 'copy_trade_upgrade' || 
      title.includes('upgrade') || 
      title.includes('rollover') || 
      notes.includes('upgraded copy')
    ) {
      return {
        label: tx.title || 'Expert Contract Upgrade',
        category: 'signals',
        isCredit: null,
        colorClass: isLightTheme ? 'text-violet-600' : 'text-violet-400',
        badgeText: 'Upgrade'
      };
    }

    // Deposits
    if (type.startsWith('deposit')) {
      const isP2P = type === 'deposit_p2p';
      return {
        label: tx.title || (isP2P ? 'P2P Local Deposit' : (tx.network ? `USDT Deposit (${tx.network})` : 'USDT Crypto Deposit')),
        category: 'deposits',
        isCredit: true,
        colorClass: isLightTheme ? 'text-emerald-600' : 'text-emerald-400',
        badgeText: isP2P ? 'P2P Inflow' : 'USDT Deposit'
      };
    }

    // Withdrawals
    if (type.startsWith('withdraw')) {
      const isP2P = type === 'withdraw_p2p';
      return {
        label: tx.title || (isP2P ? 'P2P Fiat Withdrawal' : (tx.network ? `USDT Withdrawal (${tx.network})` : 'USDT Crypto Withdrawal')),
        category: 'withdrawals',
        isCredit: false,
        colorClass: isLightTheme ? 'text-rose-600' : 'text-rose-400',
        badgeText: isP2P ? 'P2P Outflow' : 'USDT Withdrawal'
      };
    }

    // Swaps
    if (type === 'swap_crypto') {
      return {
        label: tx.title || 'Swap & Convert Asset',
        category: 'swap_buy',
        isCredit: null,
        colorClass: isLightTheme ? 'text-purple-600' : 'text-purple-400',
        badgeText: 'Swap'
      };
    }

    // Buy Crypto
    if (type === 'buy_crypto') {
      return {
        label: tx.title || 'Buy Crypto Asset',
        category: 'swap_buy',
        isCredit: false,
        colorClass: isLightTheme ? 'text-sky-600' : 'text-sky-400',
        badgeText: 'Buy'
      };
    }

    // Sell Crypto
    if (type === 'sell_crypto') {
      return {
        label: tx.title || 'Sell Crypto Asset',
        category: 'swap_buy',
        isCredit: true,
        colorClass: isLightTheme ? 'text-amber-600' : 'text-amber-400',
        badgeText: 'Sell'
      };
    }

    // Trade Tab Transfers (Transfer In to Trade Account / Transfer Out to Wallet)
    const isTradeTransferIn = 
      type === 'trade_balance_transfer_in' || 
      type === 'trade_transfer_in' || 
      type === 'transfer_in' ||
      notes.includes('wallet balance to trade balance') ||
      notes.includes('into your trade balance') ||
      (type.includes('transfer') && type.includes('in') && !type.includes('internal'));

    const isTradeTransferOut = 
      type === 'trade_balance_transfer_out' || 
      type === 'trade_transfer_out' || 
      type === 'transfer_out' ||
      notes.includes('trade balance to wallet balance') ||
      notes.includes('trade balance back to wallet') ||
      (type.includes('transfer') && type.includes('out') && !type.includes('internal'));

    if (isTradeTransferIn) {
      const cleanTitle = (tx.title && 
        !tx.title.toLowerCase().includes('signal') && 
        !tx.title.toLowerCase().includes('copy trade transfer') && 
        !tx.title.toLowerCase().includes('bot')
      ) ? tx.title : 'Transfer In (Trade Account)';
      
      return {
        label: cleanTitle,
        category: 'transfers',
        isCredit: true,
        colorClass: isLightTheme ? 'text-emerald-600' : 'text-emerald-400',
        badgeText: 'Transfer In'
      };
    }

    if (isTradeTransferOut) {
      const cleanTitle = (tx.title && 
        !tx.title.toLowerCase().includes('signal') && 
        !tx.title.toLowerCase().includes('copy trade transfer') && 
        !tx.title.toLowerCase().includes('bot')
      ) ? tx.title : 'Transfer Out (Main Wallet)';

      return {
        label: cleanTitle,
        category: 'transfers',
        isCredit: false,
        colorClass: isLightTheme ? 'text-sky-600' : 'text-sky-400',
        badgeText: 'Transfer Out'
      };
    }

    // Signals & Copy Trade
    if (
      type === 'invested' || 
      type === 'investment_earning' || 
      type === 'copy_trade_payout' || 
      type.includes('copy_trade')
    ) {
      const isEarning = type === 'investment_earning' || type === 'copy_trade_payout';
      return {
        label: tx.title || (isEarning ? 'Trading Signal Profit Payout' : 'Signal Trade Execution'),
        category: 'signals',
        isCredit: isEarning ? true : false,
        colorClass: isEarning 
          ? (isLightTheme ? 'text-emerald-600' : 'text-emerald-400')
          : (isLightTheme ? 'text-amber-600' : 'text-amber-400'),
        badgeText: 'Signal Trade'
      };
    }

    // Internal Send / Receive
    if (type === 'internal_send') {
      return {
        label: tx.title || 'Internal Transfer Out',
        category: 'transfers',
        isCredit: false,
        colorClass: isLightTheme ? 'text-sky-600' : 'text-sky-400',
        badgeText: 'Transfer'
      };
    }
    if (type === 'internal_receive') {
      return {
        label: tx.title || 'Internal Transfer In',
        category: 'transfers',
        isCredit: true,
        colorClass: isLightTheme ? 'text-emerald-600' : 'text-emerald-400',
        badgeText: 'Transfer'
      };
    }

    // Fallback
    const isCredit = tx.isCredit === true || type.startsWith('deposit') || type.includes('reward');
    return {
      label: tx.title || (isCredit ? 'Credit Entry' : 'Debit Entry'),
      category: isCredit ? 'deposits' : 'withdrawals',
      isCredit,
      colorClass: isCredit 
        ? (isLightTheme ? 'text-emerald-600' : 'text-emerald-400')
        : (isLightTheme ? 'text-rose-600' : 'text-rose-400'),
      badgeText: isCredit ? 'Credit' : 'Debit'
    };
  };

  const getStatusBadge = (status: string, tx?: Transaction) => {
    const raw = (status || '').toUpperCase().trim();
    const isNowpaymentsExpired = tx?.gateway === 'nowpayments' && 
      raw === 'PENDING APPROVAL' && 
      (tx?.gatewayStatus === 'expired' || tx?.gatewayStatus === 'failed' || (tx?.expiresAtMs && tx.expiresAtMs < Date.now()));

    if (raw === 'APPROVED') {
      return {
        label: 'Completed',
        icon: <CheckCircle2 className="w-2.5 h-2.5 text-white stroke-[2.5]" />,
        classes: 'bg-emerald-500 text-white shadow-xs border border-emerald-400/20'
      };
    }

    if (raw === 'FAILED' || raw === 'DECLINED' || raw === 'REJECTED' || raw === 'EXPIRED' || raw === 'CANCELLED' || isNowpaymentsExpired) {
      let label = 'Failed';
      if (raw === 'DECLINED' || raw === 'REJECTED') label = 'Declined';
      else if (raw === 'EXPIRED' || isNowpaymentsExpired) label = 'Expired';
      else if (raw === 'CANCELLED') label = 'Cancelled';

      return {
        label,
        icon: <XCircle className="w-2.5 h-2.5 text-white stroke-[2.5]" />,
        classes: 'bg-rose-500 text-white shadow-xs border border-rose-400/20'
      };
    }

    return {
      label: 'Pending',
      icon: <Clock className="w-2.5 h-2.5 text-white stroke-[2.5] animate-pulse" />,
      classes: 'bg-amber-500 text-white shadow-xs border border-amber-400/20'
    };
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    let date: Date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtered transactions by dropdown
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (categoryFilter === 'all') return true;
      const meta = getTxTypeMeta(tx);
      return meta.category === categoryFilter;
    });
  }, [transactions, categoryFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    let pendingCount = 0;
    let pendingAmount = 0;

    transactions.forEach(tx => {
      const meta = getTxTypeMeta(tx);
      if (tx.status === 'APPROVED') {
        if (meta.isCredit === true) {
          totalInflow += tx.amount || 0;
        } else if (meta.isCredit === false) {
          totalOutflow += tx.amount || 0;
        }
      } else if (tx.status === 'PENDING APPROVAL') {
        pendingCount += 1;
        pendingAmount += tx.amount || 0;
      }
    });

    return { totalInflow, totalOutflow, pendingCount, pendingAmount };
  }, [transactions]);

  return (
    <div id="activity-log-container" className="space-y-4 max-w-4xl mx-auto pb-10 font-sans">
      {/* 1. Header with Transaction Type Filter Dropdown (Images 1 & 2 Removed: Subtitle & Pill Badge) */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <h2 className={`text-lg sm:text-xl font-bold tracking-tight ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
          Transaction History
        </h2>

        {/* Modern Interactive Dropdown for filtering transaction types */}
        <div className="relative">
          {(() => {
            const currentOption = filterOptions.find(o => o.key === categoryFilter) || filterOptions[0];
            return (
              <>
                <button
                  id="tx-type-filter-button"
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs active:scale-[0.98] ${
                    isLightTheme 
                      ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300' 
                      : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {currentOption.icon}
                    <span>{currentOption.label}</span>
                  </div>
                  <ChevronDown 
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      isDropdownOpen ? 'rotate-180 text-emerald-500' : ''
                    }`} 
                  />
                </button>

                {isDropdownOpen && (
                  <>
                    {/* Click outside backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsDropdownOpen(false)} 
                    />

                    {/* Floating Modern Menu */}
                    <div 
                      className={`absolute right-0 top-full mt-1.5 z-50 w-52 p-1.5 rounded-2xl border shadow-xl animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md ${
                        isLightTheme 
                          ? 'bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-200/60' 
                          : 'bg-slate-900/95 border-slate-800 text-white shadow-black/40'
                      }`}
                    >
                      <div className="space-y-0.5">
                        {filterOptions.map((opt) => {
                          const isSelected = categoryFilter === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                setCategoryFilter(opt.key);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                isSelected 
                                  ? isLightTheme 
                                    ? 'bg-emerald-50 text-emerald-700 font-bold' 
                                    : 'bg-emerald-500/15 text-emerald-400 font-bold'
                                  : isLightTheme
                                    ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {opt.icon}
                                <span>{opt.label}</span>
                              </div>
                              {isSelected && (
                                <Check className={`w-3.5 h-3.5 stroke-[2.5] ${isLightTheme ? 'text-emerald-600' : 'text-emerald-400'}`} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* 2. Professional Financial Metrics Strip */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {/* Inflow Card */}
        <div className={`p-2 sm:p-2.5 rounded-2xl border transition-all ${
          isLightTheme 
            ? 'bg-white border-slate-200/90 shadow-xs hover:border-emerald-300' 
            : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/30'
        }`}>
          <div className="mb-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-bold shadow-xs">
              <ArrowDownToLine className="w-2.5 h-2.5 stroke-[3] text-white" />
              <span>Inflow</span>
            </span>
          </div>
          <div className={`text-xs sm:text-sm font-bold tracking-tight tabular-nums ${isLightTheme ? 'text-emerald-600' : 'text-emerald-400'}`}>
            +${metrics.totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Outflow Card */}
        <div className={`p-2 sm:p-2.5 rounded-2xl border transition-all ${
          isLightTheme 
            ? 'bg-white border-slate-200/90 shadow-xs hover:border-rose-300' 
            : 'bg-slate-900/90 border-slate-800 hover:border-rose-500/30'
        }`}>
          <div className="mb-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-bold shadow-xs">
              <ArrowUpFromLine className="w-2.5 h-2.5 stroke-[3] text-white" />
              <span>Outflow</span>
            </span>
          </div>
          <div className={`text-xs sm:text-sm font-bold tracking-tight tabular-nums ${isLightTheme ? 'text-rose-600' : 'text-rose-400'}`}>
            -${metrics.totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Pending Card */}
        <div className={`p-2 sm:p-2.5 rounded-2xl border transition-all ${
          isLightTheme 
            ? 'bg-white border-slate-200/90 shadow-xs hover:border-amber-300' 
            : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/30'
        }`}>
          <div className="mb-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-xs">
              <Clock className="w-2.5 h-2.5 stroke-[3] text-white" />
              <span>Pending ({metrics.pendingCount})</span>
            </span>
          </div>
          <div className={`text-xs sm:text-sm font-bold tracking-tight tabular-nums ${isLightTheme ? 'text-amber-600' : 'text-amber-400'}`}>
            ${metrics.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* 3. Transaction Items List */}
      <div className={`rounded-2xl border divide-y overflow-hidden shadow-xs transition-all ${
        isLightTheme 
          ? 'bg-white border-slate-200/90 divide-slate-100' 
          : 'bg-slate-900/90 border-slate-800 divide-slate-800/80'
      }`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 select-none">
            <RefreshCw className={`w-6 h-6 animate-spin ${isLightTheme ? 'text-emerald-600' : 'text-emerald-400'}`} />
            <span className="text-xs text-slate-500 font-semibold tracking-wide">
              Loading ledger transactions...
            </span>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-2 select-none">
            <XCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-bold text-rose-500">Failed to load transactions</p>
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center select-none flex flex-col items-center justify-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              isLightTheme ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}>
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-sm font-bold ${isLightTheme ? 'text-slate-800' : 'text-white'}`}>
                No transactions found
              </p>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                {categoryFilter !== 'all'
                  ? 'No transactions found in this category. Select "All Types" to view your entire transaction history.'
                  : 'All wallet actions, deposits, withdrawals, and bot profit transactions will be logged here.'}
              </p>
            </div>
            {categoryFilter !== 'all' && (
              <button
                onClick={() => setCategoryFilter('all')}
                className={`mt-2 px-3 py-1.5 text-xs font-semibold rounded-xl border cursor-pointer ${
                  isLightTheme 
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                View all transactions
              </button>
            )}
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const meta = getTxTypeMeta(tx);
            const statusMeta = getStatusBadge(tx.status, tx);
            const isCredit = meta.isCredit;

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isLightTheme 
                    ? 'hover:bg-slate-50/80 active:bg-slate-100/70' 
                    : 'hover:bg-slate-800/40 active:bg-slate-800/70'
                }`}
              >
                {/* Left: Realistic Transaction Icon + Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <RealisticTransactionIcon category={meta.category} isCredit={isCredit} />

                  <div className="min-w-0">
                    <span className={`font-semibold text-xs sm:text-sm truncate block ${
                      isLightTheme ? 'text-slate-900' : 'text-white'
                    }`}>
                      {meta.label}
                    </span>

                    {/* Metadata */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate font-normal">
                      <span>{formatDate(tx.createdAt)}</span>
                      <span>·</span>
                      {tx.network ? (
                        <span className={`font-medium uppercase ${isLightTheme ? 'text-slate-600' : 'text-slate-400'}`}>
                          {tx.network}
                        </span>
                      ) : (
                        <span>{meta.badgeText}</span>
                      )}
                      <span>·</span>
                      <span className="text-slate-400 font-mono text-[10px]">#{tx.id.slice(0, 6)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount in USDT + Status Badge */}
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <div className={`font-bold text-xs sm:text-sm tracking-tight tabular-nums ${meta.colorClass}`}>
                    {isCredit === true ? '+' : isCredit === false ? '-' : ''}
                    ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                  </div>

                  <div className="flex items-center gap-1.5">
                    {tx.localAmount && (
                      <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium">
                        {tx.localAmount.toLocaleString()} Shs
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs ${statusMeta.classes}`}>
                      {statusMeta.icon}
                      <span>{statusMeta.label}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Realistic Institutional Transaction Receipt Modal with Official Tether (USDT) Logo */}
      {selectedTx && (() => {
        const meta = getTxTypeMeta(selectedTx);
        const statusMeta = getStatusBadge(selectedTx.status, selectedTx);
        const isCredit = meta.isCredit;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all ${
                isLightTheme 
                  ? 'bg-white border-slate-200 text-slate-900' 
                  : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              {/* Modal Top Bar */}
              <div className={`p-4 flex items-center justify-between border-b ${
                isLightTheme ? 'border-slate-100 bg-slate-50/70' : 'border-slate-800 bg-slate-950/50'
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shrink-0">
                    <img 
                      src="/icon.svg" 
                      alt="Akuna Capital" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    AKUNA CAPITAL · TRANSACTION RECEIPT
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTx(null)}
                  className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                    isLightTheme 
                      ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                  title="Close receipt"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main Receipt Content */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Hero USDT Logo & Settlement Amount */}
                <div className="text-center space-y-2.5">
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <UsdtLogo size={56} className="drop-shadow-md" />
                      <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-xs ${
                        meta.category === 'transfers'
                          ? isCredit ? 'bg-emerald-500' : 'bg-sky-500'
                          : isCredit === true ? 'bg-emerald-500' : isCredit === false ? 'bg-rose-500' : 'bg-slate-700'
                      }`}>
                        {meta.category === 'transfers' ? (
                          isCredit ? <ArrowDownLeft className="w-3 h-3 stroke-[3]" /> : <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                        ) : isCredit === true ? (
                          <ArrowDownToLine className="w-3 h-3 stroke-[3]" />
                        ) : isCredit === false ? (
                          <ArrowUpFromLine className="w-3 h-3 stroke-[3]" />
                        ) : (
                          <Check className="w-3 h-3 stroke-[3]" />
                        )}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${meta.colorClass}`}>
                      {isCredit === true ? '+' : isCredit === false ? '-' : ''}
                      {selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                    </div>
                    <span className="text-xs font-semibold text-slate-500 block mt-0.5">
                      ≈ ${selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      {selectedTx.localAmount ? ` (${selectedTx.localAmount.toLocaleString()} Shs)` : ''}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-medium border border-slate-200/80 dark:border-slate-800">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs ${statusMeta.classes}`}>
                      {statusMeta.icon}
                      <span>{statusMeta.label}</span>
                    </span>
                    <span className="text-slate-400 text-xs">·</span>
                    <span className="text-slate-500 text-xs font-medium">{formatDate(selectedTx.createdAt)}</span>
                  </div>
                </div>

                {/* Structured Financial Settlement Card */}
                <div className={`p-4 rounded-2xl border space-y-3 text-xs ${
                  isLightTheme 
                    ? 'bg-slate-50/80 border-slate-200/90 text-slate-800' 
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-200'
                }`}>
                  {/* Settlement Asset with Official USDT Logo */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Settlement Asset
                    </span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <UsdtLogo size={18} />
                      <span>Tether USD (USDT)</span>
                    </div>
                  </div>

                  {/* Operation Type */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Transaction Type
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {meta.label}
                    </span>
                  </div>

                  {/* Reference ID with 1-click Copy */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Reference ID
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedTx.id, 'id')}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-mono transition-all cursor-pointer ${
                        copiedId === selectedTx.id
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                          : isLightTheme 
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100' 
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate max-w-[130px] sm:max-w-[180px]">{selectedTx.id}</span>
                      {copiedId === selectedTx.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                  </div>

                  {/* Blockchain Network */}
                  {selectedTx.network && (
                    <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Protocol Network
                      </span>
                      <span className="font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px]">
                        {selectedTx.network}
                      </span>
                    </div>
                  )}

                  {/* Linked Address */}
                  {selectedTx.address && (
                    <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Destination Wallet
                        </span>
                        <button
                          onClick={() => copyToClipboard(selectedTx.address || '', 'address')}
                          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          {copiedAddress ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className={`p-2 rounded-xl border text-[11px] font-mono break-all leading-tight ${
                        isLightTheme ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}>
                        {selectedTx.address}
                      </div>
                    </div>
                  )}

                  {/* Fee Breakdown */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Network Fee
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {selectedTx.feeAmount && selectedTx.feeAmount > 0 
                        ? `$${selectedTx.feeAmount.toFixed(2)} USDT` 
                        : '0.00 USDT (Subsidized)'}
                    </span>
                  </div>

                  {/* Net Amount Disbursed */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Settlement Value
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ${(selectedTx.netAmount !== undefined ? selectedTx.netAmount : selectedTx.amount).toFixed(2)} USDT
                    </span>
                  </div>

                  {/* Payment Remarks */}
                  {selectedTx.paymentMessage && (
                    <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Remarks
                      </span>
                      <p className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                        isLightTheme ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}>
                        {selectedTx.paymentMessage}
                      </p>
                    </div>
                  )}

                  {/* Verification Stamp */}
                  <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Akuna Capital Clearing Engine</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      Ledger Confirmed
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className={`p-4 border-t flex items-center justify-end gap-2.5 ${
                isLightTheme ? 'border-slate-100 bg-slate-50/70' : 'border-slate-800 bg-slate-950/50'
              }`}>
                <button
                  onClick={() => copyToClipboard(selectedTx.id, 'id')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    isLightTheme 
                      ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100' 
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedId === selectedTx.id ? 'Reference Copied!' : 'Copy Reference'}</span>
                </button>
                <button
                  onClick={() => setSelectedTx(null)}
                  className={`px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    isLightTheme 
                      ? 'bg-slate-900 text-white hover:bg-slate-800' 
                      : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  }`}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
