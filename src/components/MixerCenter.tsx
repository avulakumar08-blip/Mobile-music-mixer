import React, { useState, useEffect } from 'react';
import { AudioEngine, CrossfaderCurve } from '../audio/AudioEngine';
import { Radio, Disc, Volume2, Sparkles, Mic, Download, Play, Square, Activity } from 'lucide-react';

interface MixerCenterProps {
  engine: AudioEngine;
  onCrossfaderChange: (val: number) => void;
  crossfaderVal: number;
}

export const MixerCenter: React.FC<MixerCenterProps> = ({
  engine,
  onCrossfaderChange,
  crossfaderVal,
}) => {
  const [crossfaderCurve, setCurve] = useState<CrossfaderCurve>('smooth');
  const [masterVol, setMasterVol] = useState(0.85);

  // FX States
  const [echoActive, setEchoActive] = useState(false);
  const [reverbActive, setReverbActive] = useState(false);

  // VU Meter Levels
  const [vuA, setVuA] = useState(0);
  const [vuB, setVuB] = useState(0);
  const [vuMaster, setVuMaster] = useState(0);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  // Active pad feedback state
  const [activePad, setActivePad] = useState<string | null>(null);

  useEffect(() => {
    let animId: number;
    const updateVUs = () => {
      setVuA(engine.deckA.getVuLevel());
      setVuB(engine.deckB.getVuLevel());
      setVuMaster(engine.getMasterVu());
      animId = requestAnimationFrame(updateVUs);
    };
    animId = requestAnimationFrame(updateVUs);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  // Handle master recording
  const handleToggleRecord = async () => {
    if (isRecording) {
      const blob = await engine.stopRecording();
      setIsRecording(false);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
      }
    } else {
      setRecordedUrl(null);
      engine.onRecordDurationChange = (sec) => setRecordSeconds(sec);
      const started = engine.startRecording();
      if (started) {
        setIsRecording(true);
        setRecordSeconds(0);
      }
    }
  };

  const handlePadTrigger = (padId: string) => {
    engine.triggerSampler(padId);
    setActivePad(padId);
    setTimeout(() => {
      setActivePad((curr) => (curr === padId ? null : curr));
    }, 150);
  };

  const formatRecTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-between w-full h-full bg-[#12101e] border-x border-white/10 p-3 sm:p-4 rounded-xl shadow-2xl space-y-4">
      {/* Mixer Top Branding & Master Level */}
      <div className="w-full flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Disc className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-xs font-black tracking-widest text-slate-200 uppercase">
            MIXER CONSOLE
          </span>
        </div>

        {/* Master Recording Widget */}
        <div className="flex items-center gap-2">
          {recordedUrl && (
            <a
              href={recordedUrl}
              download={`GrooveDeck_Mix_${new Date().toISOString().slice(0, 10)}.webm`}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition shadow"
              title="Download Recorded DJ Mix"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Mix</span>
            </a>
          )}

          <button
            onClick={handleToggleRecord}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold tracking-wider transition uppercase shadow ${
              isRecording
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`} />
            {isRecording ? `REC ${formatRecTime(recordSeconds)}` : 'REC MIX'}
          </button>
        </div>
      </div>

      {/* Triple VU Peak Meter Display (Deck A, Master, Deck B) */}
      <div className="w-full bg-[#0a0814] p-2.5 rounded-lg border border-white/5 flex items-center justify-around gap-2 shadow-inner">
        {/* Deck A VU */}
        <div className="flex flex-col items-center gap-1 w-1/3">
          <div className="text-[9px] font-mono font-bold text-cyan-400">CH A</div>
          <div className="w-full max-w-[65px] h-3 bg-slate-900 rounded-sm overflow-hidden flex p-0.5 border border-white/10">
            <div
              className="h-full rounded-xs transition-all duration-75"
              style={{
                width: `${vuA}%`,
                background: vuA > 85 ? '#ef4444' : vuA > 65 ? '#eab308' : '#06b6d4',
              }}
            />
          </div>
        </div>

        {/* Master VU */}
        <div className="flex flex-col items-center gap-1 w-1/3">
          <div className="text-[9px] font-mono font-bold text-amber-400">MASTER</div>
          <div className="w-full max-w-[80px] h-3.5 bg-slate-900 rounded-sm overflow-hidden flex p-0.5 border border-amber-500/30">
            <div
              className="h-full rounded-xs transition-all duration-75"
              style={{
                width: `${vuMaster}%`,
                background: vuMaster > 85 ? '#ef4444' : vuMaster > 65 ? '#eab308' : '#10b981',
              }}
            />
          </div>
        </div>

        {/* Deck B VU */}
        <div className="flex flex-col items-center gap-1 w-1/3">
          <div className="text-[9px] font-mono font-bold text-pink-400">CH B</div>
          <div className="w-full max-w-[65px] h-3 bg-slate-900 rounded-sm overflow-hidden flex p-0.5 border border-white/10">
            <div
              className="h-full rounded-xs transition-all duration-75"
              style={{
                width: `${vuB}%`,
                background: vuB > 85 ? '#ef4444' : vuB > 65 ? '#eab308' : '#ec4899',
              }}
            />
          </div>
        </div>
      </div>

      {/* Master Volume & FX Strip */}
      <div className="w-full grid grid-cols-2 gap-2 bg-[#0c0a18] p-2.5 rounded-lg border border-white/5">
        {/* Master FX Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const next = !echoActive;
              setEchoActive(next);
              engine.setFxDelay(next, 0.45, 0.25);
            }}
            className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold tracking-wider uppercase transition border ${
              echoActive
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            ECHO
          </button>

          <button
            onClick={() => {
              const next = !reverbActive;
              setReverbActive(next);
              engine.setFxReverb(next, 0.45);
            }}
            className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold tracking-wider uppercase transition border ${
              reverbActive
                ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            REVERB
          </button>
        </div>

        {/* Master Gain Slider */}
        <div className="flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVol}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setMasterVol(val);
              engine.setMasterVolume(val);
            }}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
            title={`Master Gain: ${Math.round(masterVol * 100)}%`}
          />
          <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
            {Math.round(masterVol * 100)}%
          </span>
        </div>
      </div>

      {/* DJ Sampler & Soundboard Performance Pads (8 Pads) */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
            PERFORMANCE PADS
          </span>
          <span className="text-[9px] font-mono text-slate-500">VELOCITY ONE-SHOTS</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {[
            { id: 'kick', label: 'KICK', color: 'bg-rose-500 hover:bg-rose-400 text-white' },
            { id: 'snare', label: 'SNARE', color: 'bg-amber-500 hover:bg-amber-400 text-slate-950' },
            { id: 'clap', label: 'CLAP', color: 'bg-yellow-500 hover:bg-yellow-400 text-slate-950' },
            { id: 'hihat', label: 'HI-HAT', color: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' },
            { id: '808', label: '808 SUB', color: 'bg-purple-600 hover:bg-purple-500 text-white' },
            { id: 'airhorn', label: 'AIRHORN', color: 'bg-red-600 hover:bg-red-500 text-white font-extrabold' },
            { id: 'laser', label: 'LASER', color: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950' },
            { id: 'scratch', label: 'SCRATCH', color: 'bg-fuchsia-500 hover:bg-fuchsia-400 text-white' },
          ].map((pad) => (
            <button
              key={pad.id}
              onPointerDown={(e) => {
                e.preventDefault();
                handlePadTrigger(pad.id);
              }}
              className={`h-11 sm:h-12 rounded-lg font-mono text-[10px] font-bold tracking-wider transition-all duration-75 shadow-md flex flex-col items-center justify-center select-none active:scale-95 touch-none ${
                activePad === pad.id
                  ? 'ring-2 ring-white scale-95 shadow-[0_0_15px_white]'
                  : ''
              } ${pad.color}`}
            >
              <span>{pad.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Crossfader Section with Curve Control */}
      <div className="w-full bg-[#0a0814] p-3 rounded-xl border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="font-bold text-cyan-400">CH A</span>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-white/5">
            {(['smooth', 'linear', 'cut'] as CrossfaderCurve[]).map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCurve(c);
                  engine.setCrossfaderCurve(c);
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-semibold transition ${
                  crossfaderCurve === c
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="font-bold text-pink-400">CH B</span>
        </div>

        {/* Crossfader Rail */}
        <div className="relative w-full flex items-center py-2">
          {/* Track background */}
          <div className="w-full h-3 bg-gradient-to-r from-cyan-950 via-slate-900 to-pink-950 rounded-full border border-white/20 relative">
            {/* Center tick indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/40" />
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-0.5 h-2 bg-white/20" />
            <div className="absolute top-1/2 left-3/4 -translate-x-1/2 -translate-y-1/2 w-0.5 h-2 bg-white/20" />
          </div>

          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={crossfaderVal}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onCrossfaderChange(val);
            }}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full z-10"
          />

          {/* Draggable High-Contrast DJ Fader Knob */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-7 h-9 sm:w-8 sm:h-10 bg-gradient-to-b from-slate-200 to-slate-400 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.8)] border border-slate-900 flex items-center justify-center pointer-events-none transition-transform"
            style={{
              left: `calc(${crossfaderVal * 100}% - 14px)`,
            }}
          >
            {/* Center neon stripe */}
            <div
              className="w-1 h-6 rounded-full"
              style={{
                backgroundColor:
                  crossfaderVal < 0.4
                    ? '#06b6d4'
                    : crossfaderVal > 0.6
                    ? '#ec4899'
                    : '#eab308',
              }}
            />
          </div>
        </div>

        {/* Quick Crossfader Jump Buttons */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => onCrossfaderChange(0)}
            className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 hover:bg-slate-700 transition"
          >
            100% A
          </button>
          <button
            onClick={() => onCrossfaderChange(0.5)}
            className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            CENTER
          </button>
          <button
            onClick={() => onCrossfaderChange(1)}
            className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-pink-400 hover:bg-slate-700 transition"
          >
            100% B
          </button>
        </div>
      </div>
    </div>
  );
};
