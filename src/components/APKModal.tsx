import React, { useState } from 'react';
import { Smartphone, Download, Check, Copy, ExternalLink, ShieldCheck, Zap, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface APKModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const APKModal: React.FC<APKModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, install, isInstalled } = usePWAInstall();
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const pwabuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(currentUrl)}`;

  const bubblewrapCommand = `npm i -g @bubblewrap/cli\nbubblewrap init --manifest=${currentUrl}/manifest.webmanifest\nbubblewrap build`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(bubblewrapCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#131122] border border-cyan-500/40 p-5 sm:p-6 shadow-2xl text-slate-100 space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 shadow-lg">
            <Smartphone className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
              Android APK & Mobile Installation
            </h2>
            <p className="text-xs text-slate-400">
              Install GrooveDeck DJ as a native Android app (WebAPK / Standalone APK)
            </p>
          </div>
        </div>

        {/* Option 1: Direct 1-Click Native WebAPK Install (Recommended) */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
              Method 1 • Instant & Recommended
            </span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Google Verified WebAPK</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Direct Android WebAPK Install</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              On Android (Chrome, Edge, Samsung Internet), Google Play services automatically packages this app into a signed <strong>WebAPK</strong>. It adds an app icon to your phone drawer, runs fullscreen without browser bars, and works completely offline.
            </p>
          </div>

          <button
            onClick={async () => {
              if (isInstallable) {
                await install();
                onClose();
              } else {
                alert('If using Chrome or Android browser, tap the 3 dots menu (⋮) -> "Add to Home Screen" or "Install App" to get the APK!');
              }
            }}
            className="w-full py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-lg transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{isInstalled ? 'App Already Installed!' : 'Install APK on Android Now'}</span>
          </button>
        </div>

        {/* Option 2: Generate Signed APK via PWABuilder */}
        <div className="p-4 rounded-xl bg-[#0e0c1a] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-wider">
              Method 2 • Standalone .APK File
            </span>
            <span className="text-[11px] text-slate-400">PWABuilder (Microsoft / Google)</span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">Generate Downloadable .APK / .AAB</h3>
            <p className="text-xs text-slate-300 mt-1">
              Use PWABuilder to generate a signed Android Package (.apk) for sideloading onto any phone or publishing to Google Play Store:
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <a
              href={pwabuilderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition flex items-center justify-center gap-1.5"
            >
              <span>Build APK on PWABuilder</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleCopyUrl}
              className="w-full sm:w-auto py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-white/10 transition flex items-center justify-center gap-1.5"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'URL Copied!' : 'Copy App URL'}</span>
            </button>
          </div>
        </div>

        {/* Option 3: Bubblewrap TWA CLI */}
        <div className="p-4 rounded-xl bg-[#0a0814] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Method 3 • Google Bubblewrap CLI (Developer APK)
            </span>
            <button
              onClick={handleCopyCli}
              className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
            >
              {copiedCli ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCli ? 'Copied' : 'Copy Commands'}</span>
            </button>
          </div>

          <div className="p-2.5 rounded-lg bg-black/60 font-mono text-[11px] text-cyan-300 overflow-x-auto leading-relaxed border border-white/5">
            {bubblewrapCommand}
          </div>
        </div>

        {/* Features Checklist */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Zero-latency audio engine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Offline service worker</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dual vinyl scratch jog wheels</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-pink-400" />
            <span>WAV Mix recorder included</span>
          </div>
        </div>

        {/* Footer Close */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition border border-white/10"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
