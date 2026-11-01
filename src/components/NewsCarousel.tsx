import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SlideshowBanner } from '../types';

interface NewsCarouselProps {
  cryptoPrices?: any[];
  onOpenDeposit?: () => void;
  onOpenProfile?: (subpage?: string) => void;
  onSwitchTab?: (tab: 'home' | 'wallet' | 'trade' | 'history' | 'earn') => void;
  // Allow passing custom images directly
  customBanners?: SlideshowBanner[];
}

// High-fidelity self-contained default image banners (used when no custom images are uploaded yet)
const DEFAULT_IMAGE_BANNERS: SlideshowBanner[] = [
  {
    id: 'banner-placeholder-1',
    imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="100%">
        <defs>
          <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#050a14"/>
            <stop offset="50%" stop-color="#0b1528"/>
            <stop offset="100%" stop-color="#021c1a"/>
          </linearGradient>
          <linearGradient id="glow1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.2"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="500" fill="url(#bg1)"/>
        <g stroke="#1e293b" stroke-width="1" stroke-opacity="0.35">
          <line x1="0" y1="100" x2="1200" y2="100"/>
          <line x1="0" y1="200" x2="1200" y2="200"/>
          <line x1="0" y1="300" x2="1200" y2="300"/>
          <line x1="0" y1="400" x2="1200" y2="400"/>
          <line x1="200" y1="0" x2="200" y2="500"/>
          <line x1="400" y1="0" x2="400" y2="500"/>
          <line x1="600" y1="0" x2="600" y2="500"/>
          <line x1="800" y1="0" x2="800" y2="500"/>
          <line x1="1000" y1="0" x2="1000" y2="500"/>
        </g>
        <path d="M 0,380 Q 200,340 350,280 T 700,240 T 950,150 T 1200,100" fill="none" stroke="url(#glow1)" stroke-width="4"/>
        <path d="M 0,380 Q 200,340 350,280 T 700,240 T 950,150 T 1200,100 L 1200,500 L 0,500 Z" fill="#10b981" fill-opacity="0.08"/>
        <circle cx="950" cy="150" r="6" fill="#10b981"/>
        <circle cx="950" cy="150" r="16" fill="none" stroke="#10b981" stroke-width="1.5" stroke-opacity="0.5"/>
        <g transform="translate(80, 150)">
          <rect x="0" y="0" width="130" height="28" rx="6" fill="#10b981" fill-opacity="0.2"/>
          <text x="12" y="19" fill="#10b981" font-family="monospace" font-size="12" font-weight="bold" letter-spacing="2">PROPRIETARY</text>
          <text x="0" y="80" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" letter-spacing="-1">AKUNA CAPITAL</text>
          <text x="0" y="118" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="500">Global Algorithmic Market Making & Multi-Asset Execution</text>
          <g transform="translate(0, 150)">
            <rect x="0" y="0" width="160" height="38" rx="10" fill="#10b981"/>
            <text x="22" y="24" fill="#042f2e" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">START TRADING →</text>
          </g>
        </g>
      </svg>
    `)}`,
    title: 'Akuna Capital Trading Floor',
    actionType: 'trade',
    active: true
  },
  {
    id: 'banner-placeholder-2',
    imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="100%">
        <defs>
          <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0a0f1d"/>
            <stop offset="50%" stop-color="#111827"/>
            <stop offset="100%" stop-color="#1e1b4b"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="500" fill="url(#bg2)"/>
        <g stroke="#3b82f6" stroke-width="1.5" stroke-opacity="0.3">
          <line x1="850" y1="120" x2="1020" y2="200"/>
          <line x1="1020" y1="200" x2="940" y2="340"/>
          <line x1="940" y1="340" x2="780" y2="280"/>
          <line x1="780" y1="280" x2="850" y2="120"/>
          <line x1="850" y1="120" x2="940" y2="340"/>
        </g>
        <circle cx="850" cy="120" r="8" fill="#3b82f6"/>
        <circle cx="1020" cy="200" r="12" fill="#8b5cf6"/>
        <circle cx="940" cy="340" r="10" fill="#06b6d4"/>
        <circle cx="780" cy="280" r="7" fill="#6366f1"/>
        <g transform="translate(80, 150)">
          <rect x="0" y="0" width="160" height="28" rx="6" fill="#3b82f6" fill-opacity="0.2"/>
          <text x="12" y="19" fill="#60a5fa" font-family="monospace" font-size="12" font-weight="bold" letter-spacing="2">GLOBAL NETWORK</text>
          <text x="0" y="80" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" letter-spacing="-1">DEEP LIQUIDITY POOLS</text>
          <text x="0" y="118" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="500">Tier-1 Institutional Execution across Gold, Forex & Crypto</text>
          <g transform="translate(0, 150)">
            <rect x="0" y="0" width="160" height="38" rx="10" fill="#3b82f6"/>
            <text x="20" y="24" fill="#ffffff" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">EXPLORE MARKETS →</text>
          </g>
        </g>
      </svg>
    `)}`,
    title: 'Global Liquidity Network',
    actionType: 'none',
    active: true
  },
  {
    id: 'banner-placeholder-3',
    imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="100%" height="100%">
        <defs>
          <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0c0a09"/>
            <stop offset="50%" stop-color="#1c1917"/>
            <stop offset="100%" stop-color="#292524"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="500" fill="url(#bg3)"/>
        <g transform="translate(780, 140)">
          <rect x="0" y="0" width="320" height="200" rx="16" fill="#000000" fill-opacity="0.5" stroke="#f59e0b" stroke-opacity="0.3" stroke-width="1.5"/>
          <text x="24" y="45" fill="#f59e0b" font-family="monospace" font-size="13" font-weight="bold">QUANT ENGINE v4.2</text>
          <text x="24" y="95" fill="#ffffff" font-family="system-ui, sans-serif" font-size="28" font-weight="bold">+96.4% Accuracy</text>
          <text x="24" y="130" fill="#a8a29e" font-family="system-ui, sans-serif" font-size="14">Automated Flash Arbitrage</text>
          <line x1="24" y1="155" x2="296" y2="155" stroke="#44403c" stroke-width="1"/>
          <circle cx="280" cy="40" r="5" fill="#10b981"/>
        </g>
        <g transform="translate(80, 150)">
          <rect x="0" y="0" width="150" height="28" rx="6" fill="#f59e0b" fill-opacity="0.2"/>
          <text x="12" y="19" fill="#fbbf24" font-family="monospace" font-size="12" font-weight="bold" letter-spacing="2">AI QUANT SYSTEMS</text>
          <text x="0" y="80" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" letter-spacing="-1">AUTOMATED TRADING</text>
          <text x="0" y="118" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="500">Deploy high-performance quant bots in under 60 seconds</text>
          <g transform="translate(0, 150)">
            <rect x="0" y="0" width="160" height="38" rx="10" fill="#f59e0b"/>
            <text x="22" y="24" fill="#451a03" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">DEPLOY BOT NOW →</text>
          </g>
        </g>
      </svg>
    `)}`,
    title: 'Algorithmic Trading Systems',
    actionType: 'trade',
    active: true
  }
];

export default function NewsCarousel({ 
  onOpenDeposit,
  onOpenProfile,
  onSwitchTab,
  customBanners
}: NewsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [dbBanners, setDbBanners] = useState<SlideshowBanner[]>([]);
  const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Subscribe to live slideshow banners from Firestore settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'slideshow_banners'), (snap) => {
      setHasLoadedFromDb(true);
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.banners) && data.banners.length > 0) {
          const activeOnly = data.banners.filter((b: SlideshowBanner) => b && b.active !== false && b.imageUrl);
          if (activeOnly.length > 0) {
            setDbBanners(activeOnly);
            return;
          }
        }
      }
      setDbBanners([]);
    }, (err) => {
      console.error('Error subscribing to slideshow banners in NewsCarousel:', err);
      setHasLoadedFromDb(true);
    });
    return () => unsub();
  }, []);

  // Compute active banner list
  const activeBanners: SlideshowBanner[] = useMemo(() => {
    if (customBanners && customBanners.length > 0) {
      return customBanners.filter(b => b.active !== false);
    }
    if (dbBanners.length > 0) {
      return dbBanners;
    }
    return DEFAULT_IMAGE_BANNERS;
  }, [customBanners, dbBanners]);

  // Slideshow auto-advance (paused when hovering or interacting)
  useEffect(() => {
    if (isHovered || activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeBanners.length, isHovered]);

  // Keep active index in bounds if banner list length changes
  useEffect(() => {
    if (activeIndex >= activeBanners.length) {
      setActiveIndex(0);
    }
  }, [activeBanners.length, activeIndex]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % activeBanners.length);
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || activeBanners.length <= 1) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setActiveIndex((prev) => (prev + 1) % activeBanners.length);
      } else {
        setActiveIndex((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
      }
    }
    touchStartXRef.current = null;
  };

  const currentBanner = activeBanners[activeIndex] || activeBanners[0];

  const handleBannerClick = () => {
    if (!currentBanner) return;
    if (currentBanner.actionType === 'deposit' && onOpenDeposit) {
      onOpenDeposit();
    } else if (currentBanner.actionType === 'trade' && onSwitchTab) {
      onSwitchTab('trade');
    } else if (currentBanner.actionType === 'earn' && onSwitchTab) {
      onSwitchTab('earn');
    } else if (currentBanner.linkUrl) {
      if (currentBanner.linkUrl.startsWith('http')) {
        window.open(currentBanner.linkUrl, '_blank', 'noopener,noreferrer');
      } else if (onSwitchTab && (currentBanner.linkUrl === 'trade' || currentBanner.linkUrl === 'wallet' || currentBanner.linkUrl === 'earn' || currentBanner.linkUrl === 'history')) {
        onSwitchTab(currentBanner.linkUrl as any);
      }
    }
  };

  if (!currentBanner) {
    return null;
  }

  return (
    <div 
      id="news-carousel-container" 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleBannerClick}
      className={`relative w-full max-w-4xl mx-auto overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-slate-900 shadow-sm aspect-[21/9] sm:aspect-[2.4/1] min-h-[140px] xs:min-h-[160px] sm:min-h-[190px] md:min-h-[220px] flex items-center justify-center select-none group/carousel ${
        currentBanner.actionType !== 'none' || currentBanner.linkUrl ? 'cursor-pointer' : ''
      }`}
    >
      {/* Pure Image Slide: Full Bleed */}
      <img
        key={currentBanner.id || currentBanner.imageUrl}
        src={currentBanner.imageUrl}
        alt={currentBanner.title || `Slideshow Banner ${activeIndex + 1}`}
        className="absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 ease-in-out"
        onError={(e) => {
          // If image fails to load, gracefully fallback to default built-in SVG without infinite loop
          if (e.currentTarget.src !== DEFAULT_IMAGE_BANNERS[0].imageUrl) {
            e.currentTarget.src = DEFAULT_IMAGE_BANNERS[0].imageUrl;
          }
        }}
      />

      {/* Subtle bottom shadow vignette so dots remain visible on bright images */}
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      {/* PREVIOUS BUTTON (Appears on hover or mobile tap) */}
      {activeBanners.length > 1 && (
        <button 
          id="carousel-prev"
          onClick={handlePrev}
          className="absolute left-2 sm:left-3.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/70 hover:bg-slate-900/90 text-white border border-white/20 flex items-center justify-center transition-all backdrop-blur-md shadow-md cursor-pointer hover:scale-105 active:scale-95 opacity-80 group-hover/carousel:opacity-100"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>
      )}

      {/* NEXT BUTTON (Appears on hover or mobile tap) */}
      {activeBanners.length > 1 && (
        <button 
          id="carousel-next"
          onClick={handleNext}
          className="absolute right-2 sm:right-3.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/70 hover:bg-slate-900/90 text-white border border-white/20 flex items-center justify-center transition-all backdrop-blur-md shadow-md cursor-pointer hover:scale-105 active:scale-95 opacity-80 group-hover/carousel:opacity-100"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>
      )}

      {/* BOTTOM CAPSULE INDICATORS */}
      {activeBanners.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/60 border border-white/20 backdrop-blur-md">
          {activeBanners.map((_, idx) => (
            <button
              key={idx}
              id={`carousel-dot-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(idx);
              }}
              className={`rounded-full transition-all duration-300 cursor-pointer ${
                idx === activeIndex 
                  ? 'w-5 sm:w-6 h-1.5 bg-emerald-500 shadow-sm shadow-emerald-500/50' 
                  : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
