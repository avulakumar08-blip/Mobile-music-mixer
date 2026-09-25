/**
 * GrooveDeck DJ - Mobile Music Mixer & APK
 * Dual-deck professional DJ mixer with real-time vinyl scratch jog wheels,
 * crossfader, stem loops, sampler soundboard, master recording, and APK install.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AudioEngine } from './audio/AudioEngine';
import { DeckPanel } from './components/DeckPanel';
import { MixerCenter } from './components/MixerCenter';
import { PWAInstallButton } from './components/PWAInstallButton';
import { APKModal } from './components/APKModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Disc, Smartphone, Maximize, Minimize, Volume2, HelpCircle, Music2, Sparkles, Layers } from 'lucide-react';

export default function App() {
  // Initialize the AudioEngine once
  const engine = useMemo(() => new AudioEngine(), []);

  const [crossfaderVal, setCrossfaderVal] = useState(engine.crossfader);
  const [mobileTab, setMobileTab] = useState<'both' | 'A' | 'B'>('both');
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTips, setShowTips] = useState(false);

  // Crossfader update handler
  const handleCrossfaderChange = (val: number) => {
    setCrossfaderVal(val);
    engine.updateCrossfader(val);
  };

  const handleSyncDeckA = () => {
    engine.syncBpm('B'); // sync A to B
  };

  const handleSyncDeckB = () => {
    engine.syncBpm('A'); // sync B to A
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07060d] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Application Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0d0b1a]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-lg">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-[#0d0b1a] rounded-[10px] flex items-center justify-center">
              <Disc className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-wider bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-400 bg-clip-text text-transparent uppercase">
                GrooveDeck DJ
              </h1>
              <span className="hidden md:inline px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PRO MIXER & APK
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Dual-Deck Real-Time Audio Mixer • Scratch Vinyl • Loop FX
            </p>
          </div>
        </div>

        {/* Mobile View Switcher (Both / Deck A / Deck B) */}
        <div className="flex xl:hidden items-center bg-slate-900/90 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setMobileTab('both')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
              mobileTab === 'both' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setMobileTab('A')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
              mobileTab === 'A' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Deck A
          </button>
          <button
            onClick={() => setMobileTab('B')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
              mobileTab === 'B' ? 'bg-pink-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Deck B
          </button>
        </div>

        {/* Action Controls: Fullscreen, Tips, APK Modal & Install Button */}
        <div className="flex items-center gap-2">
          {/* Quick Tips Toggle */}
          <button
            onClick={() => setShowTips(!showTips)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition hidden sm:flex items-center justify-center"
            title="DJ Quick Tips"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition hidden sm:flex items-center justify-center"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Android APK Modal Trigger */}
          <button
            onClick={() => setIsApkModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>APK Info</span>
          </button>

          {/* Primary Install PWA / WebAPK Button */}
          <PWAInstallButton onOpenApkModal={() => setIsApkModalOpen(true)} />
        </div>
      </header>

      {/* Quick DJ Tips Banner (Collapsible) */}
      {showTips && (
        <div className="bg-[#120f24] border-b border-cyan-500/30 px-4 py-3 text-xs text-slate-300 animate-in slide-in-from-top-2">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="leading-snug">
                <strong className="text-white">DJ Tips: </strong>
                Drag or touch the <span className="text-cyan-400">Vinyl Wheels</span> to scratch. Tap <span className="text-amber-400">SYNC</span> to lock BPMs together. Use <span className="text-red-400">KILL LOW</span> on the incoming deck for clean drops, and hit <span className="text-emerald-400">REC MIX</span> to export your DJ session as a WAV file!
              </div>
            </div>
            <button
              onClick={() => setShowTips(false)}
              className="text-[11px] font-mono text-cyan-400 underline shrink-0 hover:text-cyan-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main DJ Console Workspace */}
      <main className="flex-1 p-2 sm:p-4 max-w-[1700px] w-full mx-auto flex flex-col justify-center">
        {/* Desktop 3-Column Studio Layout / Mobile Responsive View */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          {/* Deck A (Left Column - Cyan Theme) */}
          <div
            className={`xl:col-span-4 ${
              mobileTab === 'both' || mobileTab === 'A' ? 'block' : 'hidden xl:block'
            }`}
          >
            <DeckPanel
              deck={engine.deckA}
              engine={engine}
              colorScheme="cyan"
              onSync={handleSyncDeckA}
            />
          </div>

          {/* Center Mixer Console (VU Meters, Crossfader, Master Controls, Sampler) */}
          <div
            className={`xl:col-span-4 ${
              mobileTab === 'both' ? 'block' : 'hidden xl:block'
            }`}
          >
            <MixerCenter
              engine={engine}
              onCrossfaderChange={handleCrossfaderChange}
              crossfaderVal={crossfaderVal}
            />
          </div>

          {/* Deck B (Right Column - Magenta Theme) */}
          <div
            className={`xl:col-span-4 ${
              mobileTab === 'both' || mobileTab === 'B' ? 'block' : 'hidden xl:block'
            }`}
          >
            <DeckPanel
              deck={engine.deckB}
              engine={engine}
              colorScheme="magenta"
              onSync={handleSyncDeckB}
            />
          </div>
        </div>
      </main>

      {/* Bottom Features Strip */}
      <footer className="bg-[#0a0814] border-t border-white/10 px-4 py-2 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-mono">Web Audio Engine 44.1kHz Ready</span>
          </span>
          <span className="hidden md:inline text-slate-600">•</span>
          <span className="hidden md:inline">Drag & Drop any audio file to load</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsApkModalOpen(true)}
            className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-medium"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Install APK on Android Phone</span>
          </button>
        </div>
      </footer>

      {/* Offline Mode Alert */}
      <OfflineIndicator />

      {/* Dedicated Android APK Installation Modal */}
      <APKModal isOpen={isApkModalOpen} onClose={() => setIsApkModalOpen(false)} />
    </div>
  );
}
