import { CopyTraderLead } from '../types';

/**
 * Formats an expert lead's daily profit rate as an attractive, encouraging rate range for user front-end displays (e.g. "2% - 6%").
 * If the lead has a custom `displayProfitRange` set by the admin, that is used directly.
 * The underlying backend rate is maintained unchanged for actual trade signal calculations.
 */
export function getLeadDailyProfitRange(leadOrRate?: CopyTraderLead | number | null, customRange?: string): string {
  if (typeof leadOrRate === 'object' && leadOrRate !== null) {
    if (leadOrRate.displayProfitRange && leadOrRate.displayProfitRange.trim()) {
      return leadOrRate.displayProfitRange.trim();
    }
    return computeDefaultDailyRange(leadOrRate.dayProfitRate);
  }
  if (customRange && customRange.trim()) {
    return customRange.trim();
  }
  return computeDefaultDailyRange(typeof leadOrRate === 'number' ? leadOrRate : undefined);
}

function computeDefaultDailyRange(rate?: number): string {
  const base = Number(rate ?? 2.0);
  
  if (base >= 1.9 && base <= 2.1) {
    return '2% - 6%';
  }
  if (base >= 2.3 && base <= 2.5) {
    return '2.5% - 6.5%';
  }
  if (base >= 1.7 && base <= 1.85) {
    return '1.8% - 5.5%';
  }
  if (base >= 2.15 && base <= 2.25) {
    return '2.2% - 6.2%';
  }
  
  // Dynamic calculation for any custom rate set by admin
  const minRate = Number(base.toFixed(1));
  const maxRate = Number(Math.max(base * 2.8, base + 3).toFixed(1));
  const minStr = Number.isInteger(minRate) ? `${minRate}%` : `${minRate}%`;
  const maxStr = Number.isInteger(maxRate) ? `${maxRate}%` : `${maxRate}%`;
  return `${minStr} - ${maxStr}`;
}

/**
 * Formats the profit range for individual regular signals based on the daily range split across regular daily signals.
 * e.g., for 2% - 6% daily across 2 signals -> "1% - 3%"
 */
export function getLeadSignalProfitRange(leadOrRate?: CopyTraderLead | number | null, signalCount: number = 2): string {
  let displayRange: string | undefined;
  let baseRate: number | undefined;

  if (typeof leadOrRate === 'object' && leadOrRate !== null) {
    displayRange = leadOrRate.displayProfitRange;
    baseRate = leadOrRate.dayProfitRate;
  } else if (typeof leadOrRate === 'number') {
    baseRate = leadOrRate;
  }

  const count = Math.max(1, signalCount);

  // If there's an explicit custom range like "2% - 6%", parse and split proportionally across regular signals
  if (displayRange && displayRange.trim()) {
    const match = displayRange.match(/([0-9]+(?:\.[0-9]+)?)\s*%\s*-\s*([0-9]+(?:\.[0-9]+)?)\s*%/);
    if (match) {
      const minVal = parseFloat(match[1]);
      const maxVal = parseFloat(match[2]);
      if (!isNaN(minVal) && !isNaN(maxVal)) {
        const minPerSig = Number((minVal / count).toFixed(1));
        const maxPerSig = Number((maxVal / count).toFixed(1));
        return `${minPerSig}% - ${maxPerSig}%`;
      }
    }
    return displayRange.trim();
  }

  const base = Number(baseRate ?? 2.0);
  
  if (base >= 1.9 && base <= 2.1 && count === 2) {
    return '1% - 3%';
  }
  if (base >= 2.3 && base <= 2.5 && count === 2) {
    return '1.2% - 3.2%';
  }
  if (base >= 1.7 && base <= 1.85 && count === 2) {
    return '0.9% - 2.8%';
  }
  if (base >= 2.15 && base <= 2.25 && count === 2) {
    return '1.1% - 3.1%';
  }
  
  // Dynamic calculation for any custom rate
  const minPerSig = Number((base / count).toFixed(1));
  const maxPerSig = Number((Math.max(base * 2.8, base + 3) / count).toFixed(1));
  return `${minPerSig}% - ${maxPerSig}%`;
}

export const DEFAULT_COPY_LEADS: CopyTraderLead[] = [
  {
    id: 'lead-alexander-vance',
    name: 'Alexander Vance',
    photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&crop=face&w=256&h=256&q=80',
    description: 'Senior Quantitative Forex & Digital Assets Lead with 14+ years of institutional market experience. Specializes in BTC/ETH algorithmic momentum and statistical arbitrage.',
    signalsPerDay: '2 signals/day',
    winRate: '98.6%',
    copiersCount: 1840,
    minCapital: 50,
    maxCapital: 10000,
    analysisCommission: 10,
    dayProfitRate: 2.0,
    displayProfitRange: '2% - 6%',
    contractDurationDays: 30,
    tradingPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'],
    signals: [
      { id: 'sig-1', time: '13:00', code: 'VANCE13' },
      { id: 'sig-2', time: '20:00', code: 'VANCE20' }
    ],
    riskLevel: 'Low Risk'
  },
  {
    id: 'lead-marcus-sterling',
    name: 'Marcus Sterling',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&crop=face&w=256&h=256&q=80',
    description: 'Former Wall Street Derivatives Director managing systematic high-frequency order book breakouts. Focuses on macroeconomic catalysts and risk-managed execution.',
    signalsPerDay: '2 signals/day',
    winRate: '97.8%',
    copiersCount: 1420,
    minCapital: 100,
    maxCapital: 15000,
    analysisCommission: 12,
    dayProfitRate: 2.4,
    displayProfitRange: '2.5% - 6.5%',
    contractDurationDays: 30,
    tradingPairs: ['ETH/USDT', 'BTC/USDT', 'BNB/USDT', 'SOL/USDT'],
    signals: [
      { id: 'sig-1', time: '12:00', code: 'STERLING12' },
      { id: 'sig-2', time: '18:00', code: 'STERLING18' }
    ],
    riskLevel: 'Low Risk'
  },
  {
    id: 'lead-david-chen',
    name: 'David Chen',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&crop=face&w=256&h=256&q=80',
    description: 'Statistical Arbitrage & Market Neutral Lead deploying proprietary quant models across global digital asset spot and perpetual markets with strict capital preservation.',
    signalsPerDay: '2 signals/day',
    winRate: '96.5%',
    copiersCount: 2310,
    minCapital: 250,
    maxCapital: 20000,
    analysisCommission: 8,
    dayProfitRate: 2.2,
    displayProfitRange: '2.2% - 6.2%',
    contractDurationDays: 30,
    tradingPairs: ['BTC/USDT', 'SOL/USDT', 'DOGE/USDT', 'XRP/USDT'],
    signals: [
      { id: 'sig-1', time: '11:00', code: 'CHEN1100' },
      { id: 'sig-2', time: '19:00', code: 'CHEN1900' }
    ],
    riskLevel: 'Low Risk'
  },
  {
    id: 'lead-dominic-becker',
    name: 'Dominic Becker',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&crop=face&w=256&h=256&q=80',
    description: 'Institutional Quantitative Partner specializing in multi-tier Fibonacci expansions and cross-asset structural momentum breakouts with automated stop limits.',
    signalsPerDay: '2 signals/day',
    winRate: '98.2%',
    copiersCount: 1190,
    minCapital: 500,
    maxCapital: 30000,
    analysisCommission: 10,
    dayProfitRate: 2.8,
    displayProfitRange: '2.8% - 7.0%',
    contractDurationDays: 30,
    tradingPairs: ['BTC/USDT', 'ETH/USDT', 'LINK/USDT', 'SOL/USDT'],
    signals: [
      { id: 'sig-1', time: '14:00', code: 'BECKER14' },
      { id: 'sig-2', time: '21:00', code: 'BECKER21' }
    ],
    riskLevel: 'Moderate'
  },
  {
    id: 'lead-christian-reynolds',
    name: 'Christian Reynolds',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&crop=face&w=256&h=256&q=80',
    description: 'Chief Investment Strategist & Delta-Neutral Quant executing institutional volatility dispersion strategies and funding rate arbitrage with strict drawdown control.',
    signalsPerDay: '2 signals/day',
    winRate: '99.1%',
    copiersCount: 940,
    minCapital: 1000,
    maxCapital: 50000,
    analysisCommission: 12,
    dayProfitRate: 3.2,
    displayProfitRange: '3.0% - 7.5%',
    contractDurationDays: 30,
    tradingPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'],
    signals: [
      { id: 'sig-1', time: '10:00', code: 'REYNOLDS10' },
      { id: 'sig-2', time: '17:00', code: 'REYNOLDS17' }
    ],
    riskLevel: 'Low Risk'
  }
];
