import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthPage from './components/AuthPage';
import AdminPanel from './components/AdminPanel';
import StandardUserDashboard from './components/StandardUserDashboard';
import ProfileView from './components/ProfileView';
import DepositWorkflow from './components/DepositWorkflow';
import { DepositCoinModal } from './components/DepositCoinModal';
import { WithdrawCoinModal } from './components/WithdrawCoinModal';
import WithdrawalWorkflow from './components/WithdrawalWorkflow';
import SendWorkflow from './components/SendWorkflow';
import TxSuccessScreen from './components/TxSuccessScreen';
import { seedFirestoreIfNeeded } from './seedData';
import { syncLiveCryptoPrices } from './utils/cryptoApi';
import { Sparkles, ArrowLeft, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';
import { useToast } from './context/ToastContext';

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [depositCoin, setDepositCoin] = useState<string | undefined>(undefined);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [withdrawCoin, setWithdrawCoin] = useState<string | undefined>('USDT');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Background auto-sync of live crypto market prices every 15s (runs regardless of login status)
  useEffect(() => {
    syncLiveCryptoPrices(db);
    const interval = setInterval(() => {
      syncLiveCryptoPrices(db);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Helper to parse clean path from hash
  const getPathFromHash = () => {
    const hash = window.location.hash;
    if (!hash) {
      // Fallback: If there's an existing pathname, migrate/use it
      const pathname = window.location.pathname;
      if (pathname && pathname !== '/') {
        return pathname;
      }
      return '/login'; // Default view
    }
    // Remove leading '#' and optional '/'
    let clean = hash.replace(/^#\/?/, '/');
    if (!clean.startsWith('/')) {
      clean = '/' + clean;
    }
    return clean.split('?')[0];
  };

  // Routing State using hash-based routing to prevent 404 on reload
  const [path, setPath] = useState(getPathFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setPath(getPathFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    
    // On mount, if they are on a legacy non-hash path, migrate them to hash
    const initialPath = window.location.pathname;
    if (initialPath && initialPath !== '/') {
      window.location.hash = `#${initialPath}`;
      window.history.replaceState(null, '', '/' + window.location.search + window.location.hash);
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const navigate = useCallback((newPath: string, clearSearch = false) => {
    const cleanPath = newPath.startsWith('/') ? newPath : '/' + newPath;
    const currentSearch = clearSearch ? '' : window.location.search;
    const targetUrl = '/' + currentSearch + `#${cleanPath}`;
    
    if (clearSearch || cleanPath === '/dashboard' || cleanPath === '/login' || cleanPath === '/signup') {
      window.history.replaceState(null, '', targetUrl);
    } else {
      window.history.pushState(null, '', targetUrl);
    }
    setPath(cleanPath);
  }, []);

  const isAdminEmail = (email?: string | null) => {
    if (!email) return false;
    const lower = email.toLowerCase();
    return lower === 'love@gmail.com' || lower === 'joram4036@gmail.com';
  };

  // Track Firebase Auth State changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (isAdminEmail(currentUser.email)) {
          // Automatically seed the starter crypto networks & merchants into Firestore if they are empty
          await seedFirestoreIfNeeded();
        }
      } else {
        setUser(null);
      }
      setInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync redirection rules based on authentication state and current path
  useEffect(() => {
    if (initializing) return;

    // Parse query params checking both search and hash
    const searchParams = new URLSearchParams(window.location.search);
    let refValue = searchParams.get('ref') || searchParams.get('code');
    if (!refValue) {
      const hashIndex = window.location.hash.indexOf('?');
      if (hashIndex !== -1) {
        const hashParams = new URLSearchParams(window.location.hash.substring(hashIndex));
        refValue = hashParams.get('ref') || hashParams.get('code');
      }
    }
    const hasReferral = !!refValue;

    if (hasReferral) {
      // Store uppercase referral code in localStorage and clean the URL immediately to avoid loops
      const upperRef = refValue!.trim().toUpperCase();
      localStorage.setItem('pending_referral_code', upperRef);

      if (user) {
        // If a referral link is opened but a session is active, sign out first
        // so the user is correctly shown the signup page.
        localStorage.removeItem('custom_user_email');
        localStorage.removeItem('custom_user_uid');
        signOut(auth).then(() => {
          navigate('/signup', true); // clearSearch = true strips URL query params!
        });
        return;
      } else {
        // Unauthenticated user opened a referral link: send to signup with clean URL
        navigate('/signup', true);
        return;
      }
    }

    if (!user) {
      // Unauthenticated state: only allow /login, /signup, /reset
      if (path !== '/login' && path !== '/signup' && path !== '/reset') {
        navigate('/login');
      }
    } else if (isAdminEmail(user.email)) {
      // Admin: only allow /admin
      if (path !== '/admin') {
        navigate('/admin');
      }
    } else {
      // Standard authenticated user paths
      const validPaths = [
        '/dashboard',
        '/wallet',
        '/trade',
        '/earn',
        '/history',
        '/profile',
        '/deposit',
        '/send',
        '/withdraw',
        '/tx_success'
      ];
      if (!validPaths.includes(path)) {
        navigate('/dashboard', true);
      }
    }
  }, [user, initializing, path]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('custom_user_email');
      localStorage.removeItem('custom_user_uid');
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const toast = useToast();
  const handleTxSuccess = (msg: string) => {
    toast.success(msg, 'Transaction Request');
    setSuccessMessage(msg);
    navigate('/tx_success');
  };

  if (initializing) {
    return (
      <div id="app-loading-screen" className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-4 text-slate-900 font-sans">
        <div className="relative w-20 h-20 rounded-3xl bg-white border border-slate-200/90 p-3.5 flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-logo-pulse mb-1">
          <img 
            src="/icon.svg" 
            alt="Akuna Capital" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-500/5 to-transparent pointer-events-none rounded-3xl"></div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-semibold tracking-wide animate-text-blink">Connecting to Akuna Capital Trading Engine...</p>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated State
  if (!user) {
    return <AuthPage onSuccess={() => navigate('/dashboard', true)} path={path} navigate={navigate} />;
  }

  // 2. Admin Authentication Bypass
  if (isAdminEmail(user.email)) {
    return <AdminPanel onLogout={handleLogout} />;
  }

  const handleOpenDeposit = (coinSymbol?: any) => {
    if (typeof coinSymbol === 'string' && coinSymbol.trim()) {
      const cleanCoin = coinSymbol.trim();
      setDepositCoin(cleanCoin);
      sessionStorage.setItem('preselected_deposit_coin', cleanCoin);
      localStorage.setItem('preselected_deposit_coin', cleanCoin);
      navigate('/deposit');
    } else {
      // User clicked deposit icon: show modal first with available coins
      setIsDepositModalOpen(true);
    }
  };

  const handleSelectCoinFromModal = (coinSymbol: string) => {
    setIsDepositModalOpen(false);
    const cleanCoin = coinSymbol.trim();
    setDepositCoin(cleanCoin);
    sessionStorage.setItem('preselected_deposit_coin', cleanCoin);
    localStorage.setItem('preselected_deposit_coin', cleanCoin);
    navigate('/deposit');
  };

  const handleOpenWithdraw = (coinSymbol?: any) => {
    if (typeof coinSymbol === 'string' && coinSymbol.trim()) {
      const cleanCoin = coinSymbol.trim();
      setWithdrawCoin(cleanCoin);
      sessionStorage.setItem('preselected_withdraw_coin', cleanCoin);
      localStorage.setItem('preselected_withdraw_coin', cleanCoin);
      navigate('/withdraw');
    } else {
      // User clicked withdraw: show modal first like deposit modal!
      setIsWithdrawModalOpen(true);
    }
  };

  const handleSelectCoinFromWithdrawModal = (coinSymbol: string) => {
    setIsWithdrawModalOpen(false);
    const cleanCoin = coinSymbol.trim();
    setWithdrawCoin(cleanCoin);
    sessionStorage.setItem('preselected_withdraw_coin', cleanCoin);
    localStorage.setItem('preselected_withdraw_coin', cleanCoin);
    navigate('/withdraw');
  };

  // 3. Standard User Account Flows
  const showDashboard = ['/dashboard', '/wallet', '/trade', '/earn', '/history'].includes(path);

  return (
    <div id="standard-user-app" className={`${path === '/deposit' || showDashboard ? 'bg-[#f4f5f8]' : 'bg-[#131722]'} min-h-screen`}>
      {/* Deposit Coin Selection Modal */}
      <DepositCoinModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onSelectCoin={handleSelectCoinFromModal}
      />

      {/* Withdraw Coin Selection Modal (matching the Deposit Modal) */}
      <WithdrawCoinModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onSelectCoin={handleSelectCoinFromWithdrawModal}
      />
      
      {showDashboard && (
        <StandardUserDashboard
          user={user}
          onLogout={handleLogout}
          onOpenProfile={() => navigate('/profile')}
          onOpenDeposit={handleOpenDeposit}
          onOpenSend={() => navigate('/send')}
          onOpenWithdraw={handleOpenWithdraw}
          path={path}
          navigate={navigate}
        />
      )}

      {path === '/profile' && (
        <ProfileView
          user={user}
          onBack={() => navigate('/dashboard')}
        />
      )}

      {path === '/deposit' && (
        <DepositWorkflow
          user={user}
          initialCoinSymbol={depositCoin}
          onBack={() => navigate('/dashboard')}
          onSuccess={() => navigate('/wallet')}
        />
      )}

      {path === '/withdraw' && (
        <WithdrawalWorkflow
          user={user}
          initialCoinSymbol={withdrawCoin}
          onBack={() => navigate('/dashboard')}
          onGoToProfile={() => navigate('/profile')}
          onSuccess={() => handleTxSuccess('Your withdrawal request has been placed in the queue or processed successfully.')}
        />
      )}

      {path === '/send' && (
        <SendWorkflow
          user={user}
          onBack={() => navigate('/dashboard')}
          onGoToProfile={() => navigate('/profile')}
          onSuccess={(msg) => handleTxSuccess(msg)}
        />
      )}

      {path === '/tx_success' && (
        <TxSuccessScreen
          message={successMessage}
          onBack={() => navigate('/dashboard')}
        />
      )}

    </div>
  );
}
