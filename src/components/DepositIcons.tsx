import React from 'react';

/**
 * 3D Metallic Coin Badge matching the exact visual style in the uploaded screenshots.
 * USDT: Green angled 3D metallic coin with embossed Tether symbol.
 * USDC: Blue angled 3D metallic coin with embossed ($) USD Coin symbol.
 */
export function CoinBadge3D({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const sym = (symbol || '').toUpperCase().trim();

  if (sym === 'USDT') {
    return (
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="shrink-0 drop-shadow-sm select-none"
      >
        <defs>
          <linearGradient id="usdt-side" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2ba47d" />
            <stop offset="50%" stopColor="#156e52" />
            <stop offset="100%" stopColor="#0a3c2c" />
          </linearGradient>
          <radialGradient id="usdt-face" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#67e8ba" />
            <stop offset="35%" stopColor="#26a17b" />
            <stop offset="85%" stopColor="#17634c" />
            <stop offset="100%" stopColor="#0d3f30" />
          </radialGradient>
          <linearGradient id="usdt-bevel" x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#a3fad7" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#26a17b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#082b20" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {/* 3D Coin Depth / Lower Rim */}
        <ellipse cx="50" cy="54" rx="42" ry="41" fill="url(#usdt-side)" />
        {/* Coin Main Face */}
        <ellipse cx="50" cy="48" rx="41" ry="40" fill="url(#usdt-face)" />
        {/* Metallic Bevel Ring */}
        <ellipse cx="50" cy="48" rx="37" ry="36" stroke="url(#usdt-bevel)" strokeWidth="2.5" fill="none" />
        {/* Tether ₮ Symbol Embossed */}
        <path 
          d="M34 32 H66 V39 H54.5 V43 C64.5 43.6 71.5 45.8 71.5 48.5 C71.5 51.2 64.5 53.4 54.5 54 V66 H45.5 V54 C35.5 53.4 28.5 51.2 28.5 48.5 C28.5 45.8 35.5 43.6 45.5 43 V39 H34 V32 Z" 
          fill="#FFFFFF" 
          fillRule="evenodd" 
        />
        <ellipse cx="50" cy="48.5" rx="16" ry="3.5" fill="url(#usdt-face)" />
      </svg>
    );
  }

  if (sym === 'USDC') {
    return (
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="shrink-0 drop-shadow-sm select-none"
      >
        <defs>
          <linearGradient id="usdc-side" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3082d9" />
            <stop offset="50%" stopColor="#1b5394" />
            <stop offset="100%" stopColor="#0d284a" />
          </linearGradient>
          <radialGradient id="usdc-face" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#6cb7ff" />
            <stop offset="35%" stopColor="#2775ca" />
            <stop offset="85%" stopColor="#174f8c" />
            <stop offset="100%" stopColor="#0b2b52" />
          </radialGradient>
          <linearGradient id="usdc-bevel" x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#b3d9ff" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#2775ca" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#071e3b" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {/* 3D Coin Depth / Lower Rim */}
        <ellipse cx="50" cy="54" rx="42" ry="41" fill="url(#usdc-side)" />
        {/* Coin Main Face */}
        <ellipse cx="50" cy="48" rx="41" ry="40" fill="url(#usdc-face)" />
        {/* Metallic Bevel Ring */}
        <ellipse cx="50" cy="48" rx="37" ry="36" stroke="url(#usdc-bevel)" strokeWidth="2.5" fill="none" />
        {/* USDC ($) Symbol Embossed */}
        <path 
          d="M50 28 C37.85 28 28 36.95 28 48 C28 59.05 37.85 68 50 68 C62.15 68 72 59.05 72 48 C72 36.95 62.15 28 50 28 Z" 
          stroke="#FFFFFF" 
          strokeWidth="2.5" 
          strokeDasharray="28 10 28 10" 
          fill="none" 
        />
        <text 
          x="50" 
          y="56" 
          fill="#FFFFFF" 
          fontSize="24" 
          fontWeight="bold" 
          fontFamily="system-ui, -apple-system, sans-serif" 
          textAnchor="middle"
        >
          $
        </text>
      </svg>
    );
  }

  // Generic fallback coin
  return (
    <div 
      style={{ width: size, height: size }} 
      className="rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-xs shadow-sm"
    >
      {sym.slice(0, 4)}
    </div>
  );
}

/**
 * Small circular badge placed on the bottom right corner of the coin icon
 * matching the exact logos in Image 2 (Tron, BNB Smart Chain, Aptos, Solana, Polygon, etc.)
 */
export function NetworkBadgeOverlay({ networkName }: { networkName: string }) {
  const norm = (networkName || '').toUpperCase();

  // Tron: Red circle with white TRON diamond logo
  if (norm.includes('TRON') || norm.includes('TRC20') || norm === 'TRX') {
    return (
      <div 
        className="w-4 h-4 rounded-full bg-[#ec1c24] flex items-center justify-center p-0.5 shadow-sm ring-1.5 ring-white"
        title="Tron Network"
      >
        <svg viewBox="0 0 100 100" fill="white" className="w-2.5 h-2.5">
          <path d="M10 20 L90 12 L75 88 Z M28 29 L73 70 L82 23 Z" />
        </svg>
      </div>
    );
  }

  // BNB Smart Chain: Yellow circle with white Binance interlocking diamonds
  if (norm.includes('BNB') || norm.includes('BEP20') || norm.includes('BSC') || norm.includes('BINANCE')) {
    return (
      <div 
        className="w-4 h-4 rounded-full bg-[#f3ba2f] flex items-center justify-center p-0.5 shadow-sm ring-1.5 ring-white"
        title="BNB Smart Chain"
      >
        <svg viewBox="0 0 100 100" fill="white" className="w-2.5 h-2.5">
          <path d="M50 15 L62 27 L38 51 L26 39 Z M50 85 L38 73 L62 49 L74 61 Z M15 50 L27 38 L39 50 L27 62 Z M85 50 L73 38 L61 50 L73 62 Z M50 38 L62 50 L50 62 L38 50 Z" />
        </svg>
      </div>
    );
  }

  // Aptos: Black circle with white Aptos segmented horizontal stripes
  if (norm.includes('APTOS')) {
    return (
      <div 
        className="w-4 h-4 rounded-full bg-[#111111] flex items-center justify-center p-0.5 shadow-sm ring-1.5 ring-white"
        title="Aptos Network"
      >
        <svg viewBox="0 0 100 100" fill="white" className="w-2.5 h-2.5">
          <path d="M20 28 H80 V36 H20 Z M24 46 H76 V54 H24 Z M30 64 H70 V72 H30 Z" />
        </svg>
      </div>
    );
  }

  // Solana: Purple-to-cyan gradient circle with white parallel angled bars
  if (norm.includes('SOL') || norm.includes('SPL')) {
    return (
      <div 
        className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#9945FF] to-[#14F195] flex items-center justify-center p-0.5 shadow-sm ring-1.5 ring-white"
        title="Solana Network"
      >
        <svg viewBox="0 0 100 100" fill="white" className="w-2.5 h-2.5">
          <path d="M22 28 L72 28 L80 20 L30 20 Z M28 54 L78 54 L70 46 L20 46 Z M22 80 L72 80 L80 72 L30 72 Z" />
        </svg>
      </div>
    );
  }

  // Polygon: Purple circle with white Polygon logo
  if (norm.includes('POLYGON') || norm.includes('MATIC')) {
    return (
      <div 
        className="w-4 h-4 rounded-full bg-[#8247e5] flex items-center justify-center p-0.5 shadow-sm ring-1.5 ring-white"
        title="Polygon Network"
      >
        <svg viewBox="0 0 100 100" fill="white" className="w-2.5 h-2.5">
          <path d="M69 35 L50 24 L31 35 L31 58 L50 69 L69 58 Z" />
        </svg>
      </div>
    );
  }

  // Arbitrum One: Blue circle with white Arbitrum triangle
  if (norm.includes('ARB') || norm.includes('ARBITRUM')) {
    return (
      <div 
        className="w-4 h-4 rounded-full bg-[#28a0f0] flex items-center justify-center p-0.5 shadow-sm ring-1.5 ring-white"
        title="Arbitrum One"
      >
        <svg viewBox="0 0 100 100" fill="white" className="w-2.5 h-2.5">
          <path d="M50 15 L85 75 H68 L50 42 L32 75 H15 Z" />
        </svg>
      </div>
    );
  }

  // Ethereum: Dark slate-blue circle with white Ethereum diamond
  return (
    <div 
      className="w-4 h-4 rounded-full bg-[#627eea] flex items-center justify-center p-0.5 shadow-sm ring-1.5 ring-white"
      title="Ethereum Network"
    >
      <svg viewBox="0 0 100 100" fill="white" className="w-2.5 h-2.5">
        <path d="M50 10 L25 52 L50 63 L75 52 Z M50 67 L25 56 L50 90 L75 56 Z" />
      </svg>
    </div>
  );
}
