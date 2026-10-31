import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { CryptoNetwork, CryptoPrice } from '../types';
import { CoinBadge3D } from './DepositIcons';

interface WithdrawCoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCoin: (coinSymbol: string) => void;
  networks?: CryptoNetwork[];
  cryptoPrices?: CryptoPrice[];
}

interface DisplayCoin {
  symbol: string;
  name: string;
}

// Default fallback list (Only USDT is supported for withdrawal via BEP20)
const DEFAULT_COIN_LIST: DisplayCoin[] = [
  { symbol: 'USDT', name: 'Tether' },
];

export function WithdrawCoinModal({
  isOpen,
  onClose,
  onSelectCoin,
  networks,
}: WithdrawCoinModalProps) {
  const [liveNetworks, setLiveNetworks] = useState<CryptoNetwork[]>(networks || []);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = onSnapshot(collection(db, 'crypto_networks'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => {
          const data = d.data();
          return {
            id: (data.id || d.id).toLowerCase(),
            tokenName: data.tokenName || d.id.toUpperCase(),
            networks: Array.isArray(data.networks) ? data.networks : [],
            addresses: data.addresses && typeof data.addresses === 'object' ? data.addresses : {},
            minWithdrawalUSD: typeof data.minWithdrawalUSD === 'number' ? data.minWithdrawalUSD : 10,
            minDepositUSD: typeof data.minDepositUSD === 'number' ? data.minDepositUSD : 5
          } as CryptoNetwork;
        });
        setLiveNetworks(list);
      }
    }, (err) => {
      console.warn('Error reading crypto_networks in WithdrawCoinModal:', err);
    });
    return () => unsub();
  }, [isOpen]);

  const coinsToDisplay = useMemo<DisplayCoin[]>(() => {
    const source = liveNetworks.length > 0 ? liveNetworks : (networks && networks.length > 0 ? networks : []);
    // Only USDT can be withdrawn because it is linked to the verified BEP20 address. Explicitly remove USDC.
    const usdtOnly = source.filter(net => net.id.toLowerCase() === 'usdt');
    if (usdtOnly.length > 0) {
      return usdtOnly.map(net => {
        const symbol = net.id.toUpperCase();
        let name = net.tokenName || symbol;
        const parenMatch = name.match(/^([^(]+)\s*\(([^)]+)\)$/);
        if (parenMatch) {
          name = parenMatch[1].trim();
        }
        return { symbol, name };
      });
    }
    return DEFAULT_COIN_LIST;
  }, [liveNetworks, networks]);

  if (!isOpen) return null;

  return (
    <div 
      id="withdraw-coin-modal-overlay" 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="withdraw-coin-modal-card" 
        className="w-full sm:max-w-md bg-white text-slate-900 rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
      >
        {/* Top Centered Drag Handle Pill */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4 shrink-0"></div>

        {/* Modal Header: Bold "Withdraw" and Circular Close Button */}
        <div className="flex items-center justify-between pb-1 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-black tracking-tight">Withdraw</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Select cryptocurrency (BEP20 payout)</p>
          </div>
          <button
            id="close-withdraw-coin-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center text-lg font-bold transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Coin Selection Card(s) - Single USDT card full width or 2-col if multiple */}
        <div className={`mt-4 overflow-y-auto max-h-[58vh] pr-0.5 ${coinsToDisplay.length === 1 ? 'space-y-3' : 'grid grid-cols-2 gap-3.5'}`} id="withdraw-coins-grid">
          {coinsToDisplay.map((coin) => (
            <button
              key={coin.symbol}
              id={`withdraw-coin-option-${coin.symbol.toLowerCase()}`}
              onClick={() => {
                onSelectCoin(coin.symbol);
              }}
              className={`bg-[#0e1320] border border-slate-800/90 hover:border-emerald-500 rounded-2xl p-4 cursor-pointer text-left transition-all hover:scale-[1.01] active:scale-[0.98] shadow-md group relative overflow-hidden ${
                coinsToDisplay.length === 1 ? 'flex items-center justify-between w-full h-24' : 'h-32 flex flex-col justify-between'
              }`}
            >
              <div className="flex items-center gap-3.5">
                {/* 3D Coin Badge */}
                <div className="shrink-0">
                  <CoinBadge3D symbol={coin.symbol} size={42} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base tracking-wide group-hover:text-emerald-400 transition-colors">
                      {coin.symbol}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      BEP20
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                    {coin.name || 'Tether'} • BNB Smart Chain
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WithdrawCoinModal;
