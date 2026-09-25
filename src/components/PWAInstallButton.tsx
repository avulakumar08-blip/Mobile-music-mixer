import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Check, Sparkles } from 'lucide-react';

interface PWAInstallButtonProps {
  onOpenApkModal?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onOpenApkModal }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA / WebAPK
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
        <Check className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Installed as APK</span>
        <span className="sm:hidden">App Installed</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Primary Install APK / App Button */}
      <button
        onClick={async () => {
          if (isInstallable) {
            const installed = await install();
            if (!installed && onOpenApkModal) {
              onOpenApkModal();
            }
          } else if (isIOS) {
            setShowIOSGuide(true);
          } else if (onOpenApkModal) {
            onOpenApkModal();
          }
        }}
        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold px-3 py-1.5 text-xs sm:text-sm shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all active:scale-95"
        title="Install Music Mixer APK on your device"
      >
        <Smartphone className="w-4 h-4 shrink-0" />
        <span>Install APK</span>
      </button>

      {/* APK Guide & Download Center trigger */}
      {onOpenApkModal && (
        <button
          onClick={onOpenApkModal}
          className="p-1.5 rounded-lg border border-white/10 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          title="Open APK Download & Build Center"
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
        </button>
      )}

      {/* iOS Safari Fallback Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#141224] border border-cyan-500/30 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Install on iPhone / iPad</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              1. Tap the <strong className="text-cyan-400">Share</strong> button in Safari toolbar.<br />
              2. Scroll down and tap <strong className="text-cyan-400">Add to Home Screen</strong>.<br />
              3. Launch GrooveDeck from your home screen for the full fullscreen DJ experience!
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-semibold text-white transition border border-white/10"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
