import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { CryptoNetwork, CryptoPrice } from '../types';
import { CoinBadge3D } from './DepositIcons';

interface DepositCoinModalProps {
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

// Default fallback matching Image 1 if database is initializing
const DEFAULT_COIN_LIST: DisplayCoin[] = [
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'USDC', name: 'USD Coin' },
];

export function DepositCoinModal({
  isOpen,
  onClose,
  onSelectCoin,
  networks,
}: DepositCoinModalProps) {
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
        // Sort with usdt, usdc, btc, eth, sol, bnb...
        const order = ['usdt', 'usdc', 'btc', 'eth', 'sol', 'bnb', 'xrp', 'wld', 'trx', 'doge'];
        list.sort((a, b) => {
          const indexA = order.indexOf(a.id);
          const indexB = order.indexOf(b.id);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.id.localeCompare(b.id);
        });
        setLiveNetworks(list);
      }
    }, (err) => {
      console.warn('Error reading crypto_networks in DepositCoinModal:', err);
    });
    return () => unsub();
  }, [isOpen]);

  const coinsToDisplay = useMemo<DisplayCoin[]>(() => {
    const source = liveNetworks.length > 0 ? liveNetworks : (networks && networks.length > 0 ? networks : []);
    if (source.length > 0) {
      return source.map(net => {
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
      id="deposit-coin-modal-overlay" 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="deposit-coin-modal-card" 
        className="w-full sm:max-w-md bg-white text-slate-900 rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
      >
        {/* Top Centered Drag Handle Pill */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4 shrink-0"></div>

        {/* Modal Header: Bold "Deposit" and Circular Close Button */}
        <div className="flex items-center justify-between pb-1 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-black tracking-tight">Deposit</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Select a cryptocurrency to deposit</p>
          </div>
          <button
            id="close-deposit-coin-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center text-lg font-bold transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* 2-Column Grid of Sleek Dark Cards (matching Image 1) */}
        <div className="grid grid-cols-2 gap-3.5 mt-4 overflow-y-auto max-h-[58vh] pr-0.5" id="deposit-coins-grid">
          {coinsToDisplay.map((coin) => (
            <button
              key={coin.symbol}
              id={`deposit-coin-option-${coin.symbol.toLowerCase()}`}
              onClick={() => {
                onSelectCoin(coin.symbol);
              }}
              className="bg-[#0e1320] border border-slate-800/90 hover:border-emerald-500 rounded-2xl p-4 h-32 flex flex-col justify-between cursor-pointer text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md group"
            >
              {/* Top-left: 3D Coin Badge */}
              <div className="shrink-0">
                <CoinBadge3D symbol={coin.symbol} size={38} />
              </div>

              {/* Bottom-left: Bold White Token Symbol */}
              <div>
                <div className="font-bold text-white text-base tracking-wide group-hover:text-emerald-400 transition-colors">
                  {coin.symbol}
                </div>
                {coin.name && coin.name !== coin.symbol && (
                  <div className="text-[10px] text-slate-400 truncate font-medium">
                    {coin.name}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
export default DepositCoinModal;
