import React, { useState, useRef, useEffect } from 'react';
import { DJDeck, AudioEngine } from '../audio/AudioEngine';
import { JogWheel } from './JogWheel';
import { WaveformVisualizer } from './WaveformVisualizer';
import { Play, Pause, RotateCcw, Upload, Sliders, Music, Zap, VolumeX, RefreshCw } from 'lucide-react';

interface DeckPanelProps {
  deck: DJDeck;
  engine: AudioEngine;
  colorScheme: 'cyan' | 'magenta';
  onSync: () => void;
}

export const DeckPanel: React.FC<DeckPanelProps> = ({
  deck,
  engine,
  colorScheme,
  onSync,
}) => {
  const isCyan = colorScheme === 'cyan';
  const primaryBg = isCyan ? 'bg-cyan-500' : 'bg-pink-500';
  const primaryText = isCyan ? 'text-cyan-400' : 'text-pink-400';
  const primaryBorder = isCyan ? 'border-cyan-500/40' : 'border-pink-500/40';
  const glowShadow = isCyan ? 'shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'shadow-[0_0_15px_rgba(236,72,153,0.3)]';

  const [isPlaying, setIsPlaying] = useState(deck.isPlaying);
  const [pitchRate, setPitchRate] = useState(deck.playbackRate);
  const [volume, setVolume] = useState(deck.volume);
  const [eqHigh, setEqHigh] = useState(deck.eqHigh);
  const [eqMid, setEqMid] = useState(deck.eqMid);
  const [eqLow, setEqLow] = useState(deck.eqLow);
  const [filter, setFilter] = useState(deck.filterVal);
  const [loopActive, setLoopActive] = useState(deck.loopActive);
  const [loopBeats, setLoopBeats] = useState(deck.loopBeats);
  const [hotCues, setHotCues] = useState<(number | null)[]>([...deck.hotCues]);
  const [bpm, setBpm] = useState(deck.bpm);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state periodically from engine
  useEffect(() => {
    const timer = setInterval(() => {
      setIsPlaying(deck.isPlaying);
      setBpm(deck.bpm);
    }, 100);
    return () => clearInterval(timer);
  }, [deck]);

  const togglePlay = () => {
    if (deck.isPlaying) {
      deck.pause();
      setIsPlaying(false);
    } else {
      deck.play();
      setIsPlaying(true);
    }
  };

  const handleCue = () => {
    deck.jumpToHotCue(0);
    setIsPlaying(deck.isPlaying);
  };

  const handlePitchChange = (rate: number) => {
    setPitchRate(rate);
    deck.setPlaybackRate(rate);
    setBpm(deck.bpm);
  };

  const resetPitch = () => {
    handlePitchChange(1.0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await engine.loadTrackFromFile(file, deck.id);
      setIsPlaying(deck.isPlaying);
      setBpm(deck.bpm);
      setHotCues([...deck.hotCues]);
    }
  };

  const toggleLoop = (beats: number) => {
    deck.toggleLoop(beats);
    setLoopActive(deck.loopActive);
    setLoopBeats(beats);
  };

  const handleHotCueClick = (index: number) => {
    deck.jumpToHotCue(index);
    setHotCues([...deck.hotCues]);
    setIsPlaying(deck.isPlaying);
  };

  const killEq = (band: 'low' | 'mid' | 'high') => {
    if (band === 'low') {
      const next = eqLow <= -35 ? 0 : -40;
      setEqLow(next);
      deck.setEq('low', next);
    } else if (band === 'mid') {
      const next = eqMid <= -35 ? 0 : -40;
      setEqMid(next);
      deck.setEq('mid', next);
    } else {
      const next = eqHigh <= -35 ? 0 : -40;
      setEqHigh(next);
      deck.setEq('high', next);
    }
  };

  return (
    <div
      className={`flex flex-col w-full h-full bg-[#100e1c] rounded-xl p-3 sm:p-4 border ${primaryBorder} ${glowShadow} space-y-3`}
    >
      {/* Deck Header: Deck ID, Track Title, File Upload, BPM & SYNC */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm text-slate-950 font-mono shadow ${primaryBg}`}
          >
            {deck.id}
          </div>
          <div className="truncate min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-100 truncate flex items-center gap-1.5">
              <span>{deck.name}</span>
            </h2>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className={`font-bold ${primaryText}`}>{bpm} BPM</span>
              <span>•</span>
              <span>{pitchRate >= 1.0 ? `+${((pitchRate - 1) * 100).toFixed(1)}%` : `${((pitchRate - 1) * 100).toFixed(1)}%`}</span>
            </div>
          </div>
        </div>

        {/* Sync & Load Track Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onSync}
            className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono tracking-wider uppercase transition shadow flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 active:scale-95`}
            title="Sync BPM with opposite deck"
          >
            <RefreshCw className="w-3 h-3 text-amber-400" />
            <span>SYNC</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition"
            title="Load custom MP3/WAV/FLAC track"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Waveform Visualizer Display */}
      <WaveformVisualizer deck={deck} colorScheme={colorScheme} isPlaying={isPlaying} />

      {/* Center DJ Turntable Jog Wheel */}
      <div className="flex items-center justify-center py-1">
        <JogWheel
          deck={deck}
          colorScheme={colorScheme}
          isPlaying={isPlaying}
          bpm={bpm}
        />
      </div>

      {/* Pitch / Tempo Slider Strip */}
      <div className="flex items-center justify-between gap-2 bg-[#0c0a18] p-2 rounded-lg border border-white/5">
        <span className="text-[10px] font-mono text-slate-400 font-semibold">TEMPO</span>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[9px] font-mono text-slate-500">-16%</span>
          <input
            type="range"
            min="0.84"
            max="1.16"
            step="0.002"
            value={pitchRate}
            onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
          />
          <span className="text-[9px] font-mono text-slate-500">+16%</span>
        </div>
        <button
          onClick={resetPitch}
          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white transition"
          title="Reset Tempo to 0.0%"
        >
          RESET
        </button>
      </div>

      {/* 3-Band Equalizer & Dual Filter Knobs */}
      <div className="grid grid-cols-4 gap-1.5 bg-[#0a0814] p-2 rounded-lg border border-white/5 text-center">
        {/* HIGH EQ */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-between w-full px-1">
            <span className="text-[9px] font-mono text-slate-400 font-bold">HIGH</span>
            <button
              onClick={() => killEq('high')}
              className={`text-[8px] font-mono px-1 rounded transition ${
                eqHigh <= -35 ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              KILL
            </button>
          </div>
          <input
            type="range"
            min="-40"
            max="6"
            value={eqHigh}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setEqHigh(val);
              deck.setEq('high', val);
            }}
            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
          />
          <span className="text-[9px] font-mono text-slate-500">{eqHigh.toFixed(0)}dB</span>
        </div>

        {/* MID EQ */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-between w-full px-1">
            <span className="text-[9px] font-mono text-slate-400 font-bold">MID</span>
            <button
              onClick={() => killEq('mid')}
              className={`text-[8px] font-mono px-1 rounded transition ${
                eqMid <= -35 ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              KILL
            </button>
          </div>
          <input
            type="range"
            min="-40"
            max="6"
            value={eqMid}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setEqMid(val);
              deck.setEq('mid', val);
            }}
            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
          />
          <span className="text-[9px] font-mono text-slate-500">{eqMid.toFixed(0)}dB</span>
        </div>

        {/* LOW EQ */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-between w-full px-1">
            <span className="text-[9px] font-mono text-slate-400 font-bold">LOW</span>
            <button
              onClick={() => killEq('low')}
              className={`text-[8px] font-mono px-1 rounded transition ${
                eqLow <= -35 ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              KILL
            </button>
          </div>
          <input
            type="range"
            min="-40"
            max="6"
            value={eqLow}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setEqLow(val);
              deck.setEq('low', val);
            }}
            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
          />
          <span className="text-[9px] font-mono text-slate-500">{eqLow.toFixed(0)}dB</span>
        </div>

        {/* DUAL FILTER (LP / HP) */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-between w-full px-1">
            <span className="text-[9px] font-mono text-slate-400 font-bold">FILTER</span>
            <button
              onClick={() => {
                setFilter(0);
                deck.setFilter(0);
              }}
              className="text-[8px] font-mono px-1 rounded bg-slate-800 text-slate-400"
            >
              CLR
            </button>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={filter}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setFilter(val);
              deck.setFilter(val);
            }}
            className="w-full accent-amber-400 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
          />
          <span className="text-[9px] font-mono text-slate-500">
            {filter < -5 ? 'LP' : filter > 5 ? 'HP' : 'FLAT'}
          </span>
        </div>
      </div>

      {/* Beat Looper & Hot Cues Row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Looper */}
        <div className="bg-[#0c0a18] p-2 rounded-lg border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold">
            <span>BEAT LOOP</span>
            <button
              onClick={() => toggleLoop(loopBeats)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition ${
                loopActive ? 'bg-amber-400 text-slate-950 shadow-[0_0_8px_#facc15]' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {loopActive ? 'ACTIVE' : 'LOOP'}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 4, 8].map((beats) => (
              <button
                key={beats}
                onClick={() => toggleLoop(beats)}
                className={`py-1 rounded text-[9px] font-mono font-bold transition ${
                  loopActive && loopBeats === beats
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {beats}B
              </button>
            ))}
          </div>
        </div>

        {/* Hot Cues (1, 2, 3, 4) */}
        <div className="bg-[#0c0a18] p-2 rounded-lg border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold">
            <span>HOT CUES</span>
            <span className="text-[8px] text-slate-500">SET / JUMP</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[0, 1, 2, 3].map((idx) => {
              const hasCue = hotCues[idx] !== null;
              return (
                <button
                  key={idx}
                  onClick={() => handleHotCueClick(idx)}
                  className={`py-1 rounded text-[9px] font-mono font-bold transition border ${
                    hasCue
                      ? isCyan
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]'
                        : 'bg-pink-500 text-slate-950 border-pink-400 shadow-[0_0_6px_rgba(236,72,153,0.6)]'
                      : 'bg-slate-800/80 text-slate-400 border-white/5 hover:bg-slate-700'
                  }`}
                >
                  C{idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main DJ Transport Buttons (CUE & PLAY/PAUSE) & Volume Fader */}
      <div className="flex items-center gap-2 pt-1">
        {/* CUE Button */}
        <button
          onClick={handleCue}
          className="flex-1 py-3 sm:py-3.5 rounded-xl font-mono text-xs sm:text-sm font-black tracking-wider uppercase bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg active:scale-95 transition flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          <span>CUE</span>
        </button>

        {/* PLAY / PAUSE Button */}
        <button
          onClick={togglePlay}
          className={`flex-[1.5] py-3 sm:py-3.5 rounded-xl font-mono text-xs sm:text-sm font-black tracking-wider uppercase shadow-xl active:scale-95 transition flex items-center justify-center gap-2 ${
            isPlaying
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
              : `${primaryBg} text-slate-950 shadow-md`
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>PLAY</span>
            </>
          )}
        </button>

        {/* Channel Volume Level Slider */}
        <div className="flex flex-col items-center gap-1 w-16 bg-[#0c0a18] p-1.5 rounded-lg border border-white/5">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
              deck.setVolume(val);
            }}
            className="w-full accent-cyan-400 h-1.5 bg-slate-700 rounded appearance-none cursor-pointer"
          />
          <span className="text-[9px] font-mono text-slate-400">{Math.round(volume * 100)}%</span>
        </div>
      </div>
    </div>
  );
};
