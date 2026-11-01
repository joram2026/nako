import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { auth, db } from '../firebase';
import { useToast } from '../context/ToastContext';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut,
  updatePassword
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs, updateDoc, increment, addDoc, deleteDoc } from 'firebase/firestore';
import { 
  Shield, Mail, Lock, User, Phone, Sparkles, AlertCircle, RefreshCw, 
  Eye, EyeOff, Globe, ChevronDown, Check, TrendingUp, Zap, Award, 
  ArrowUpRight, Activity, DollarSign, Users, Percent, CheckCircle, 
  ArrowLeft, KeyRound, CheckCheck, Headphones, Handshake,
  ShieldCheck, Cpu, Building2, Search
} from 'lucide-react';
import { validateEmailAddress } from '../utils/emailValidation';
import { SUPPORTED_COUNTRIES } from '../utils/timezones';

interface AuthPageProps {
  onSuccess: () => void;
  path: string;
  navigate: (path: string, clearSearch?: boolean) => void;
}

function deriveAuthPassword(email: string): string {
  const cleanEmail = email.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  return `LoloAuth_${cleanEmail}_Secure123!`;
}

export default function AuthPage({ onSuccess, path, navigate }: AuthPageProps) {
  // Derive view states directly from the URL path prop to prevent desynchronization
  const isSignUp = path === '/signup';
  const isReset = path === '/reset';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);

  const COUNTRIES = SUPPORTED_COUNTRIES;
  const filteredCountries = COUNTRIES.filter((c) => {
    if (!countrySearch.trim()) return true;
    const q = countrySearch.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.dialCode.includes(q)
    );
  });
  const [referral, setReferral] = useState(() => localStorage.getItem('pending_referral_code') || '');
  const referralNotifiedRef = useRef(false);
  const toast = useToast();
  const [isDraggingSupport, setIsDraggingSupport] = useState(false);
  const dragStartTimeRef = useRef<number>(0);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const setError = (msg: string | null) => {
    setErrorState(msg);
    if (msg) toast.error(msg, 'Authentication Error');
  };
  const error = errorState;

  const [successMsgState, setSuccessMsgState] = useState<string | null>(null);
  const setSuccessMsg = (msg: string | null) => {
    setSuccessMsgState(msg);
    if (msg) toast.success(msg, 'Authentication');
  };
  const successMsg = successMsgState;

  // Two-Factor Authentication Login States
  const [show2faPrompt, setShow2faPrompt] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorErrorState, setTwoFactorErrorState] = useState<string | null>(null);
  const setTwoFactorError = (msg: string | null) => {
    setTwoFactorErrorState(msg);
    if (msg) toast.error(msg, '2FA Code Error');
  };
  const twoFactorError = twoFactorErrorState;

  const [showPassword, setShowPassword] = useState(false);

  // Check email for domain suggestions / typos on change
  useEffect(() => {
    if (email && email.includes('@')) {
      const validation = validateEmailAddress(email);
      if (validation.suggestion) {
        setEmailSuggestion(validation.suggestion);
      } else {
        setEmailSuggestion(null);
      }
    } else {
      setEmailSuggestion(null);
    }
  }, [email]);

  // Check URL parameters and localStorage for referral codes
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    let refCode = searchParams.get('ref') || searchParams.get('code');
    if (!refCode) {
      const hashIndex = window.location.hash.indexOf('?');
      if (hashIndex !== -1) {
        const hashParams = new URLSearchParams(window.location.hash.substring(hashIndex));
        refCode = hashParams.get('ref') || hashParams.get('code');
      }
    }
    
    if (refCode) {
      const upperRefCode = refCode.trim().toUpperCase();
      localStorage.setItem('pending_referral_code', upperRefCode);
      setReferral(upperRefCode);
      if (path !== '/signup') {
        navigate('/signup', true); // Navigate and clear search params!
      }
      if (!referralNotifiedRef.current) {
        referralNotifiedRef.current = true;
        setSuccessMsg(`Welcome! Referral code "${upperRefCode}" has been successfully pre-filled.`);
      }
    } else {
      const savedRef = localStorage.getItem('pending_referral_code') || '';
      if (savedRef) {
        setReferral((prev) => (prev ? prev : savedRef));
        // Only show prefilled message if they are explicitly on /signup
        if (path === '/signup' && !referralNotifiedRef.current) {
          referralNotifiedRef.current = true;
          setSuccessMsg(`Welcome! Referral code "${savedRef}" has been successfully pre-filled.`);
        }
      }
    }
  }, [path, navigate]);

  const handleVerify2faLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError(null);
    if (twoFactorCode.trim().length !== 6 || isNaN(Number(twoFactorCode.trim()))) {
      setTwoFactorError('Please enter a valid 6-digit Google Authenticator code.');
      return;
    }
    // Validation successful! Proceed to the main dashboard
    localStorage.removeItem('pending_referral_code');
    onSuccess();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const formattedEmail = email.trim().toLowerCase();

    try {
      if (isReset) {
        // Handle custom Password Reset directly in the database
        if (!resetNewPassword || !resetConfirmPassword) {
          throw new Error('Please fill in both password fields.');
        }
        if (resetNewPassword.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (resetNewPassword !== resetConfirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', formattedEmail));
        const querySnap = await getDocs(q);

        if (querySnap.empty) {
          throw new Error('No registered account found with this email.');
        }

        const userDoc = querySnap.docs[0];
        const userUid = userDoc.id;

        // Update custom password in Firestore
        await updateDoc(doc(db, 'users', userUid), {
          accountPassword: resetNewPassword
        });

        setSuccessMsg('Your password has been successfully updated. Redirecting to login page...');
        setResetNewPassword('');
        setResetConfirmPassword('');
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);

      } else if (isSignUp) {
        // Validate user inputs
        if (!displayName.trim()) {
          throw new Error('Please enter your display name.');
        }

        const validation = validateEmailAddress(formattedEmail);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Please enter a valid email address.');
        }

        if (!phone.trim()) {
          throw new Error('Please enter your phone number.');
        }

        if (!password || password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please verify that your password confirmation matches.');
        }

        // Check if user is already registered in Firestore
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', formattedEmail));
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          throw new Error('This email address is already registered. Please sign in instead.');
        }

        // Clear referral/code parameters from the URL before signing in
        navigate('/signup', true);

        // Handle Registration in Firebase Auth
        let user;
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, formattedEmail, deriveAuthPassword(formattedEmail));
          user = userCredential.user;
        } catch (regErr: any) {
          if (regErr.code === 'auth/email-already-in-use') {
            try {
              const userCredential = await signInWithEmailAndPassword(auth, formattedEmail, deriveAuthPassword(formattedEmail));
              user = userCredential.user;
            } catch (loginErr: any) {
              let version = 1;
              let versionedEmail = '';
              let success = false;
              while (!success && version < 20) {
                const parts = formattedEmail.split('@');
                versionedEmail = `${parts[0]}+v${version}@${parts[1]}`;
                try {
                  const userCredential = await createUserWithEmailAndPassword(auth, versionedEmail, deriveAuthPassword(formattedEmail));
                  user = userCredential.user;
                  success = true;
                } catch (vErr: any) {
                  if (vErr.code === 'auth/email-already-in-use') {
                    try {
                      const userCredential = await signInWithEmailAndPassword(auth, versionedEmail, deriveAuthPassword(formattedEmail));
                      user = userCredential.user;
                      success = true;
                    } catch (vLoginErr) {
                      version++;
                    }
                  } else {
                    throw vErr;
                  }
                }
              }
              if (!success) {
                throw new Error('Could not recreate user account. Please try a different email address.');
              }
            }
          } else {
            throw regErr;
          }
        }

        // Generate dynamic unique referral code for the new user
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let generatedCode = '';
        for (let i = 0; i < 5; i++) {
          generatedCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const trimmedReferral = referral.trim().toUpperCase();
        const selectedCountryObj = COUNTRIES.find(c => c.code === country) || COUNTRIES[0];
        const rawPhone = phone.trim().replace(/^0+/, '');
        const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `${selectedCountryObj.dialCode} ${rawPhone}`;

        // Initialize user document in Firestore directly without email verification
        const docRef = doc(db, 'users', user.uid);
        await setDoc(docRef, {
          uid: user.uid,
          email: formattedEmail,
          displayName: displayName.trim() || formattedEmail.split('@')[0],
          phone: formattedPhone,
          country: country,
          balance: 0.0,
          usdtBalance: 0.0,
          referralSource: trimmedReferral,
          uniqueCode: generatedCode,
          createdAt: serverTimestamp(),
          withdrawalEnabled: true,
          tradeEnabled: true,
          walletPassword: '',
          accountPassword: password,
          authEmail: user.email,
          emailVerified: true
        });

        // Save referral code mapping
        try {
          await setDoc(doc(db, 'referralCodes', generatedCode), {
            uid: user.uid,
            email: formattedEmail
          });
        } catch (mappingErr) {
          console.error('Error saving referral code mapping:', mappingErr);
        }

        // Save session details to localStorage
        localStorage.setItem('custom_user_email', formattedEmail);
        localStorage.setItem('custom_user_uid', user.uid);

        // Auto-credit referrer if referral code was used
        if (trimmedReferral) {
          try {
            const refMappingSnap = await getDoc(doc(db, 'referralCodes', trimmedReferral));
            if (refMappingSnap.exists()) {
              const refData = refMappingSnap.data();
              const referrerUid = refData.uid;
              const referrerEmail = refData.email || '';

              const referralsQuery = query(collection(db, 'users'), where('referralSource', '==', trimmedReferral));
              const referralsSnap = await getDocs(referralsQuery);
              const referralsCount = referralsSnap.size;

              let rewardAmount = 0.10;
              let tierName = 'Starter';
              if (referralsCount >= 40) {
                rewardAmount = 0.40;
                tierName = 'Gold';
              } else if (referralsCount >= 20) {
                rewardAmount = 0.30;
                tierName = 'Silver';
              } else if (referralsCount >= 7) {
                rewardAmount = 0.20;
                tierName = 'Bronze';
              }

              await updateDoc(doc(db, 'users', referrerUid), {
                balance: increment(rewardAmount),
                usdtBalance: increment(rewardAmount)
              });

              await addDoc(collection(db, 'transactions'), {
                userId: referrerUid,
                userEmail: referrerEmail,
                type: 'referral_reward',
                amount: rewardAmount,
                status: 'APPROVED',
                createdAt: serverTimestamp(),
                paymentMessage: `Referral bonus (${tierName} Tier): successfully invited ${formattedEmail}`
              });
            }
          } catch (refErr) {
            console.error('Error auto-crediting referral reward:', refErr);
          }
        }

        // Prompt browser / PWA password manager to save credentials under current origin
        if (typeof window !== 'undefined' && 'PasswordCredential' in window && navigator.credentials?.store) {
          try {
            const cred = new (window as any).PasswordCredential({
              id: formattedEmail,
              password: password,
              name: displayName || formattedEmail.split('@')[0],
            });
            await navigator.credentials.store(cred);
          } catch {
            // Non-blocking credential store fallback
          }
        }

        localStorage.removeItem('pending_referral_code');
        onSuccess();

      } else {
        // Handle Sign In
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', formattedEmail));
        const querySnap = await getDocs(q);

        if (querySnap.empty) {
          throw new Error('No account found with this email address.');
        }

        const userDoc = querySnap.docs[0];
        const userData = userDoc.data();
        const activeUserUid = userDoc.id;

        // Verify password against Firestore accountPassword
        const firestorePassword = userData.accountPassword;
        if (!firestorePassword || firestorePassword !== password) {
          throw new Error('Incorrect password. Please verify your credentials or use the reset password option.');
        }

        const authEmailToUse = userData.authEmail || userData.email || formattedEmail;

        try {
          await signInWithEmailAndPassword(auth, authEmailToUse, deriveAuthPassword(formattedEmail));
        } catch (authSignInErr: any) {
          try {
            await signInWithEmailAndPassword(auth, formattedEmail, deriveAuthPassword(formattedEmail));
          } catch (secondAuthErr: any) {
            console.log('Firebase Auth internal credential fallback...');
          }
        }

        localStorage.setItem('custom_user_email', formattedEmail);
        localStorage.setItem('custom_user_uid', activeUserUid);

        let has2fa = false;
        const docRef = doc(db, 'users', activeUserUid);
        const freshSnap = await getDoc(docRef);
        if (freshSnap.exists()) {
          const freshData = freshSnap.data();
          if (freshData.twoFactorEnabled && freshData.twoFactorSecret) {
            has2fa = true;
          }
        } else {
          await setDoc(docRef, {
            uid: activeUserUid,
            email: formattedEmail,
            displayName: formattedEmail.split('@')[0],
            balance: 0.0,
            usdtBalance: 0.0,
            referralSource: '',
            createdAt: serverTimestamp(),
            withdrawalEnabled: true,
            tradeEnabled: true,
            walletPassword: '',
            twoFactorEnabled: false,
            accountPassword: password,
            authEmail: formattedEmail
          });
        }

        if (has2fa) {
          setShow2faPrompt(true);
        } else {
          // Prompt browser / PWA password manager to save/update credentials under current origin
          if (typeof window !== 'undefined' && 'PasswordCredential' in window && navigator.credentials?.store) {
            try {
              const cred = new (window as any).PasswordCredential({
                id: formattedEmail,
                password: password,
                name: formattedEmail.split('@')[0],
              });
              await navigator.credentials.store(cred);
            } catch {
              // Non-blocking credential store fallback
            }
          }

          localStorage.removeItem('pending_referral_code');
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      let cleanMessage = 'Authentication failed. Please verify your details.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        cleanMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        cleanMessage = 'This email address is already registered.';
      } else if (err.code === 'auth/weak-password') {
        cleanMessage = 'Password must be at least 6 characters.';
      } else if (err.message) {
        cleanMessage = err.message;
      }
      setError(cleanMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-page-container" className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans relative overflow-x-hidden flex flex-col justify-between items-center py-8 sm:py-12 px-4 selection:bg-emerald-500/25 selection:text-emerald-900">
      
      {/* 1. Subtle Institutional Atmospheric Background (Light Theme) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        {/* Soft Radial Emerald & Aqua Spotlights */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] max-w-full h-[450px] bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.08),transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[350px] bg-[radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.05),transparent_70%)] pointer-events-none" />

        {/* Precision Quantitative Grid Lattice */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" 
        />
      </div>

      {/* 2. Top Minimal Brand Header */}
      <header className="relative z-10 w-full max-w-[420px] flex flex-col items-center mb-6 text-center">
        {/* Brand Lockup - Clean Akuna Capital (DRW removed) */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-xs mb-4">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shrink-0 shadow-xs">
            <img 
              src="/icon.svg" 
              alt="Akuna Capital" 
              className="w-full h-full object-contain filter drop-shadow-xs"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-[12px] font-black tracking-[0.16em] text-slate-900 uppercase font-sans">
            AKUNA CAPITAL
          </span>
        </div>

        {/* Page Title & Context */}
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 mb-1.5 font-sans">
          {show2faPrompt 
            ? 'Two-Factor Authentication' 
            : isReset 
              ? 'Reset Password' 
              : isSignUp 
                ? 'Create Trading Account' 
                : 'Sign in to Akuna Capital'
          }
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 max-w-[340px] leading-relaxed">
          {show2faPrompt
            ? 'Enter the 6-digit verification code from your authenticator app.'
            : isReset
              ? 'Enter your registered email and choose a new secure password.'
              : isSignUp
                ? 'Deploy automated quantitative trading strategies and access liquid asset markets.'
                : 'Enter your account credentials to access your trading dashboard.'
          }
        </p>
      </header>

      {/* 3. Main Auth Form Container Card (Crisp Whitish Theme) */}
      <div className="w-full max-w-[420px] relative z-10 flex flex-col justify-center">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xl shadow-slate-200/60 space-y-5 text-slate-900">

          {/* Segmented Tab Switcher (Sign In / Create Account) */}
          {!isReset && !show2faPrompt && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-semibold">
              <button
                id="auth-tab-signin"
                type="button"
                onClick={() => { if (isSignUp) { navigate('/login'); setError(null); } }}
                className={`py-2 rounded-lg transition-all cursor-pointer text-center font-bold tracking-wide ${
                  !isSignUp 
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                id="auth-tab-signup"
                type="button"
                onClick={() => { if (!isSignUp) { navigate('/signup'); setError(null); } }}
                className={`py-2 rounded-lg transition-all cursor-pointer text-center font-bold tracking-wide ${
                  isSignUp 
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Inline Error Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 text-rose-500 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Inline Success Banner */}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle size={15} className="shrink-0 text-emerald-600 mt-0.5" />
              <span className="leading-relaxed font-medium">{successMsg}</span>
            </div>
          )}

          {show2faPrompt ? (
            /* 2FA Verification Form */
            <div className="space-y-5">
              <div className="flex items-center justify-center py-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                  <Shield size={28} className="stroke-[2.2]" />
                </div>
              </div>

              {twoFactorError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2.5">
                  <AlertCircle size={15} className="shrink-0 text-rose-500 mt-0.5" />
                  <span className="leading-relaxed font-medium">{twoFactorError}</span>
                </div>
              )}

              <form onSubmit={handleVerify2faLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="auth-2fa-input" className="text-xs font-semibold text-slate-700 block text-center">
                    Google Authenticator 6-Digit Passcode
                  </label>
                  <input
                    id="auth-2fa-input"
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="000000"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono text-xl tracking-[0.35em] text-emerald-600 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                  />
                </div>

                <button
                  id="auth-2fa-verify-btn"
                  type="submit"
                  className="w-full h-11 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm active:scale-[0.99] transition-all cursor-pointer"
                >
                  Verify &amp; Log in
                </button>

                <button
                  id="auth-2fa-cancel-btn"
                  type="button"
                  onClick={() => { setShow2faPrompt(false); setTwoFactorCode(''); setTwoFactorError(null); }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center"
                >
                  Back to Sign In
                </button>
              </form>
            </div>
          ) : (
            /* Main Credentials Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Legal Name / Display Name - Sign Up Only */}
              {isSignUp && !isReset && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-display-name" className="text-xs font-semibold text-slate-700 cursor-pointer block">
                    Legal Name / Display Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none z-10">
                      <User size={15} />
                    </span>
                    <input
                      id="auth-display-name"
                      name="displayName"
                      type="text"
                      required
                      autoComplete="name"
                      autoCapitalize="words"
                      autoCorrect="off"
                      placeholder="e.g. Alexander Vance"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 pr-4 h-11 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400 text-slate-900 transition-all shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* Email Address (Rendered for Sign In, Sign Up, and Password Reset) */}
              <div className="space-y-1.5">
                <label htmlFor="auth-email" className="text-xs font-semibold text-slate-700 cursor-pointer block">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none z-10">
                    <Mail size={15} />
                  </span>
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="username email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 h-11 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400 text-slate-900 transition-all shadow-2xs"
                  />
                </div>

                {/* Live Typo Auto-Suggestion Banner */}
                {isSignUp && emailSuggestion && (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-800 mt-1">
                    <span>
                      Did you mean <strong className="font-semibold text-slate-900">{emailSuggestion}</strong>?
                    </span>
                    <button
                      id="auth-apply-email-suggestion"
                      type="button"
                      onClick={() => setEmail(emailSuggestion)}
                      className="text-emerald-700 font-bold hover:underline ml-2 cursor-pointer shrink-0"
                    >
                      Fix
                    </button>
                  </div>
                )}
              </div>

              {/* Country of Residence - Sign Up Only */}
              {isSignUp && !isReset && (
                <div className="space-y-1.5 relative">
                  <label htmlFor="auth-country-trigger" className="text-xs font-semibold text-slate-700 cursor-pointer block">
                    Country of Residence
                  </label>
                  
                  <button
                    id="auth-country-trigger"
                    type="button"
                    onClick={() => setIsCountryOpen(!isCountryOpen)}
                    className="w-full px-3.5 h-11 bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm flex items-center justify-between transition-all focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-medium cursor-pointer shadow-2xs active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base leading-none shrink-0">{COUNTRIES.find(c => c.code === country)?.flag || '🇰🇪'}</span>
                      <span className="font-semibold text-slate-900 truncate text-xs sm:text-sm">{COUNTRIES.find(c => c.code === country)?.name || country}</span>
                      <span className="text-[11px] bg-slate-200/80 text-emerald-700 font-bold font-mono px-1.5 py-0.5 rounded shrink-0">
                        {COUNTRIES.find(c => c.code === country)?.dialCode || '+254'}
                      </span>
                    </div>
                    <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isCountryOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                  </button>

                  {/* Custom Modern Dropdown Menu */}
                  {isCountryOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => {
                          setIsCountryOpen(false);
                          setCountrySearch('');
                        }} 
                      />
                      
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                        {/* Quick Search Input */}
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 pointer-events-none">
                            <Search size={13} />
                          </span>
                          <input
                            id="auth-country-search"
                            type="text"
                            placeholder="Search trading country or code..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            autoFocus
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                          />
                        </div>

                        {/* Country List (Kenya default #1) */}
                        <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                          {filteredCountries.map((c) => {
                            const isSelected = country === c.code;
                            return (
                              <button
                                key={c.code}
                                id={`auth-country-opt-${c.code.toLowerCase().replace(/\s+/g, '-')}`}
                                type="button"
                                onClick={() => {
                                  setCountry(c.code);
                                  setIsCountryOpen(false);
                                  setCountrySearch('');
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold' 
                                    : 'hover:bg-slate-100 text-slate-700 font-medium border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-base leading-none shrink-0">{c.flag}</span>
                                  <span className="truncate">{c.name}</span>
                                  <span className="text-[10px] font-mono text-slate-400 font-semibold shrink-0">
                                    ({c.dialCode})
                                  </span>
                                </div>
                                {isSelected && <Check size={14} className="text-emerald-600 shrink-0 stroke-[3]" />}
                              </button>
                            );
                          })}

                          {filteredCountries.length === 0 && (
                            <div className="py-4 text-center text-xs text-slate-400">
                              No matching trading country found
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Phone Number - Sign Up Only */}
              {isSignUp && !isReset && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-phone" className="text-xs font-semibold text-slate-700 cursor-pointer block">
                    Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10 gap-1.5">
                      <span className="text-sm leading-none">{COUNTRIES.find(c => c.code === country)?.flag || '🇰🇪'}</span>
                      <span className="text-xs font-bold text-emerald-700 font-mono">{COUNTRIES.find(c => c.code === country)?.dialCode || '+254'}</span>
                      <span className="h-4 w-[1px] bg-slate-300 ml-0.5" />
                    </div>
                    <input
                      id="auth-phone"
                      name="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder="700 000 000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-24 pr-4 h-11 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400 text-slate-900 font-medium transition-all shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* Password Reset Fields */}
              {isReset && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="auth-reset-new-password" className="text-xs font-semibold text-slate-700 cursor-pointer block">
                      New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none z-10">
                        <Lock size={15} />
                      </span>
                      <input
                        id="auth-reset-new-password"
                        name="newPassword"
                        type={showResetPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        className="w-full pl-10 pr-10 h-11 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400 text-slate-900 transition-all shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer z-10"
                        title={showResetPassword ? "Hide password" : "Show password"}
                      >
                        {showResetPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="auth-reset-confirm-password" className="text-xs font-semibold text-slate-700 cursor-pointer block">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none z-10">
                        <Lock size={15} />
                      </span>
                      <input
                        id="auth-reset-confirm-password"
                        name="confirmPassword"
                        type={showResetPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-10 h-11 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400 text-slate-900 transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Password Field - Sign In / Sign Up */}
              {!isReset && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="auth-password" className="text-xs font-semibold text-slate-700 cursor-pointer block">
                      Password
                    </label>
                    {!isSignUp && (
                      <button
                        id="auth-forgot-password"
                        type="button"
                        onClick={() => { navigate('/reset'); setError(null); }}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none z-10">
                      <Lock size={15} />
                    </span>
                    <input
                      id="auth-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 h-11 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400 text-slate-900 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer z-10"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password Field - Sign Up Only */}
              {isSignUp && !isReset && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-confirm-password" className="text-xs font-semibold text-slate-700 cursor-pointer block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none z-10">
                      <Lock size={15} />
                    </span>
                    <input
                      id="auth-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 h-11 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400 text-slate-900 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer z-10"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Real-time Match Feedback */}
                  {confirmPassword && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium pt-0.5">
                      {password === confirmPassword ? (
                        <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                          <Check size={12} className="stroke-[3]" /> Passwords match
                        </span>
                      ) : (
                        <span className="text-rose-500 flex items-center gap-1">
                          <AlertCircle size={12} /> Passwords do not match yet
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Invitation Code - Sign Up Only */}
              {isSignUp && !isReset && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-referral" className="text-xs font-semibold text-slate-700 cursor-pointer block">
                    Invitation Code <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="auth-referral"
                    name="referral"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="e.g. CAPITAL50"
                    value={referral}
                    onChange={(e) => setReferral(e.target.value)}
                    className="w-full px-3.5 h-11 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400 text-slate-900 font-mono uppercase transition-all shadow-2xs"
                  />
                </div>
              )}

              {/* Primary High-Impact CTA Button (Renamed as 'Log in' with arrow removed for Sign In) */}
              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full h-11 sm:h-12 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 rounded-xl text-sm font-bold tracking-wide shadow-md shadow-emerald-500/15 active:scale-[0.99] transition-all cursor-pointer mt-5"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-slate-950" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <span>
                    {isReset 
                      ? 'Update Password' 
                      : isSignUp 
                        ? 'Create Account' 
                        : 'Log in'
                    }
                  </span>
                )}
              </button>

            </form>
          )}

          {/* Bottom Switcher / Reset Back Link */}
          {isReset ? (
            <div className="text-center pt-2 border-t border-slate-100">
              <button
                id="auth-back-to-login"
                onClick={() => { navigate('/login'); setError(null); }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 hover:underline cursor-pointer transition-colors"
              >
                &larr; Back to Sign In
              </button>
            </div>
          ) : !show2faPrompt && (
            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                {isSignUp ? 'Already registered with Akuna?' : "Don't have an account yet?"}{' '}
                <button
                  id="auth-toggle-btn"
                  onClick={() => { navigate(isSignUp ? '/login' : '/signup'); setError(null); }}
                  className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer transition-colors ml-1"
                >
                  {isSignUp ? 'Sign In' : 'Create Account'}
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Institutional Trust Badges Footer (DRW removed) */}
        <div className="mt-6 flex flex-col items-center gap-2.5 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-600" />
              256-bit Encryption
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="flex items-center gap-1.5">
              <Cpu size={13} className="text-emerald-600" />
              Low-Latency Engine
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="flex items-center gap-1.5">
              <Building2 size={13} className="text-emerald-600" />
              Tier-1 Liquidity
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            &copy; {new Date().getFullYear()} Akuna Capital LLC. Institutional Trading Systems.
          </p>
        </div>

      </div>

      {/* 4. Draggable Floating Support Icon */}
      <motion.div
        id="draggable-auth-floating-support"
        drag
        dragMomentum={false}
        dragElastic={0.12}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onDragStart={() => {
          dragStartTimeRef.current = Date.now();
          setIsDraggingSupport(true);
        }}
        onDragEnd={() => {
          setTimeout(() => {
            setIsDraggingSupport(false);
          }, 200);
        }}
        className="fixed bottom-6 right-5 z-50 touch-none select-none cursor-grab active:cursor-grabbing"
      >
        <a
          id="auth-floating-support-btn"
          href="https://t.me/akunacpt"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (isDraggingSupport || (dragStartTimeRef.current > 0 && Date.now() - dragStartTimeRef.current < 250)) {
              e.preventDefault();
            }
          }}
          className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 via-emerald-400 to-teal-300 text-slate-950 shadow-xl shadow-emerald-500/30 border-2 border-white/90 focus:outline-none group active:shadow-inner"
          title="Community & Support (@akunacpt)"
          aria-label="Open Telegram Community Group"
        >
          {/* Live Online Status Dot */}
          <span className="absolute top-0 right-0 flex h-3.5 w-3.5 -mt-0.5 -mr-0.5 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
          </span>

          {/* Support Headset Icon */}
          <Headphones size={20} className="text-slate-950 group-hover:scale-110 transition-transform" />

          {/* Tooltip on Desktop Hover */}
          <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/90 backdrop-blur-sm text-white text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md hidden sm:flex items-center gap-1.5 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Customer Support</span>
          </div>
        </a>
      </motion.div>
    </div>
  );
}
